package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type User struct {
	ID             int64
	Username       string
	DisplayName    string
	PasswordHash   string
	Role           string
	Status         string
	SessionVersion int
}

type AuthRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewAuthRepository(db *sql.DB, redisClient *redis.Client) *AuthRepository {
	return &AuthRepository{db: db, redis: redisClient}
}

func (r *AuthRepository) FindByUsername(ctx context.Context, username string) (User, error) {
	var user User
	err := r.db.QueryRowContext(ctx, "SELECT id, username, display_name, password_hash, role, status, session_version FROM users WHERE username = ?", username).
		Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.Status, &user.SessionVersion)
	return user, err
}

func (r *AuthRepository) FindByID(ctx context.Context, id int64) (User, error) {
	var user User
	err := r.db.QueryRowContext(ctx, "SELECT id, username, display_name, password_hash, role, status, session_version FROM users WHERE id = ?", id).
		Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.Status, &user.SessionVersion)
	return user, err
}

// 同一账号在前台、后台各保留一个会话。Lua 保证并发登录时替换是原子的。
var saveSessionScript = redis.NewScript(`
local previous = redis.call('GET', KEYS[1])
if previous then redis.call('DEL', previous) end
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
redis.call('SET', KEYS[1], KEYS[2], 'EX', ARGV[2])
return 1
`)

func activeSessionPrefix(scope string) string { return "session:active:" + scope + ":" }

func (r *AuthRepository) SaveSession(ctx context.Context, scope, token string, userID int64, version int) error {
	return saveSessionScript.Run(ctx, r.redis,
		[]string{activeSessionPrefix(scope) + strconv.FormatInt(userID, 10), sessionKey(scope, token)},
		fmt.Sprintf("%d:%d", userID, version), int((12 * time.Hour).Seconds())).Err()
}

// 同时核对会话与账号索引；升级前没有索引的旧会话也需要重新登录。
var readSessionScript = redis.NewScript(`
local value = redis.call('GET', KEYS[1])
if not value then return false end
local id = string.match(value, '^(%d+):')
if not id or redis.call('GET', ARGV[1] .. id) ~= KEYS[1] then return false end
return value
`)

func (r *AuthRepository) sessionValue(ctx context.Context, key string) (string, error) {
	parts := strings.Split(key, ":")
	if len(parts) != 3 || (parts[1] != "front" && parts[1] != "admin") {
		return "", redis.Nil
	}
	return readSessionScript.Run(ctx, r.redis, []string{key}, activeSessionPrefix(parts[1])).Text()
}

func (r *AuthRepository) SessionUserID(ctx context.Context, scope, token string) (int64, int, error) {
	value, err := r.sessionValue(ctx, sessionKey(scope, token))
	if err != nil {
		return 0, 0, err
	}
	idText, versionText, ok := strings.Cut(value, ":")
	if !ok {
		return 0, 0, redis.Nil
	}
	id, err := strconv.ParseInt(idText, 10, 64)
	if err != nil {
		return 0, 0, redis.Nil
	}
	version, err := strconv.Atoi(versionText)
	if err != nil {
		return 0, 0, redis.Nil
	}
	return id, version, nil
}

// 旧设备退出只能删除自己的会话，不能删掉新设备的索引。
var deleteSessionScript = redis.NewScript(`
local value = redis.call('GET', KEYS[1])
if value then
 local id = string.match(value, '^(%d+):')
 if id and redis.call('GET', ARGV[1] .. id) == KEYS[1] then
  redis.call('DEL', ARGV[1] .. id)
 end
end
return redis.call('DEL', KEYS[1])
`)

func (r *AuthRepository) DeleteSession(ctx context.Context, scope, token string) error {
	return deleteSessionScript.Run(ctx, r.redis, []string{sessionKey(scope, token)}, activeSessionPrefix(scope)).Err()
}

func (r *AuthRepository) FailedLogins(ctx context.Context, username string) (int64, error) {
	count, err := r.redis.Get(ctx, failureKey(username)).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func (r *AuthRepository) RecordFailedLogin(ctx context.Context, username string) error {
	key := failureKey(username)
	pipe := r.redis.TxPipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, 15*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *AuthRepository) ClearFailedLogins(ctx context.Context, username string) error {
	return r.redis.Del(ctx, failureKey(username)).Err()
}

func sessionKey(scope, token string) string {
	hash := sha256.Sum256([]byte(token))
	return "session:" + scope + ":" + hex.EncodeToString(hash[:])
}

func failureKey(username string) string {
	hash := sha256.Sum256([]byte(username))
	return "login:fail:" + hex.EncodeToString(hash[:])
}
