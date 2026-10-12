package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var ErrEmailCode = errors.New("invalid or expired email code")
var ErrEmailSendLimited = errors.New("email sending rate limited")
var ErrEmailUnavailable = errors.New("email unavailable")

// RegistrationEmail only sends registration challenges, never account passwords.
type RegistrationEmail struct {
	redis     *redis.Client
	key, from string
	client    *http.Client
}

func NewRegistrationEmail(client *redis.Client, key, from string) *RegistrationEmail {
	return &RegistrationEmail{redis: client, key: key, from: from, client: &http.Client{Timeout: 10 * time.Second}}
}

func normalizeEmail(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	address, err := mail.ParseAddress(value)
	if err != nil || address.Address != value || strings.IndexFunc(value, func(r rune) bool { return r > 127 }) >= 0 || len(value) > 254 || !strings.Contains(strings.SplitN(value, "@", 2)[1], ".") {
		return "", ErrInvalidInput
	}
	return value, nil
}

func emailDigest(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

// All counters and the cooldown are reserved atomically before contacting Resend.
var reserveEmail = redis.NewScript(`
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
for i=2,4 do
 if tonumber(redis.call('GET', KEYS[i]) or '0') >= tonumber(ARGV[i-1]) then return 0 end
end
redis.call('SET', KEYS[1], '1', 'EX', 60)
for i=2,4 do
 local n=redis.call('INCR', KEYS[i])
 if n == 1 then redis.call('EXPIRE', KEYS[i], i == 4 and 86400 or 3600) end
end
return 1
`)

func (s *RegistrationEmail) Send(ctx context.Context, email, ip string) error {
	if s == nil || s.key == "" || s.from == "" {
		return ErrEmailUnavailable
	}
	email, err := normalizeEmail(email)
	if err != nil {
		return err
	}
	base := "register:email:" + emailDigest(email)
	allowed, err := reserveEmail.Run(ctx, s.redis, []string{base + ":cooldown", base + ":hour", "register:mail-ip:" + emailDigest(ip), "register:mail-day"}, 5, 10, 90).Int()
	if err != nil {
		return err
	}
	if allowed != 1 {
		return ErrEmailSendLimited
	}
	number, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return err
	}
	code := fmt.Sprintf("%06d", number.Int64())
	digest := emailDigest(email + ":" + code)
	// A resend invalidates the previous challenge; failed/ambiguous deliveries are not usable.
	if err := s.redis.Del(ctx, base+":code").Err(); err != nil {
		return err
	}
	body, err := json.Marshal(map[string]any{"from": s.from, "to": []string{email}, "subject": "Retniw 博客 · 注册验证码", "text": "你的注册验证码是：" + code + "\n\n10 分钟内有效，请勿向他人透露。若非本人操作，请忽略此邮件。"})
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+s.key)
	request.Header.Set("Content-Type", "application/json")
	response, err := s.client.Do(request)
	if err != nil {
		return ErrEmailUnavailable
	}
	defer response.Body.Close()
	// Never log provider response bodies: they can contain recipient data.
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("%w (status %d)", ErrEmailUnavailable, response.StatusCode)
	}
	return s.redis.Set(ctx, base+":code", digest+":0", 10*time.Minute).Err()
}

var consumeEmail = redis.NewScript(`
local value=redis.call('GET', KEYS[1])
if not value then return 0 end
local hash, attempts=string.match(value, '^(%x+):(%d+)$')
if not hash then redis.call('DEL', KEYS[1]); return 0 end
if hash == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end
attempts=tonumber(attempts)+1
if attempts >= 5 then redis.call('DEL', KEYS[1])
else redis.call('SET', KEYS[1], hash..':'..attempts, 'KEEPTTL') end
return 0
`)

func (s *RegistrationEmail) Verify(ctx context.Context, email, code string) error {
	if s == nil {
		return ErrEmailUnavailable
	}
	if len(code) != 6 || strings.IndexFunc(code, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		return ErrEmailCode
	}
	valid, err := consumeEmail.Run(ctx, s.redis, []string{"register:email:" + emailDigest(email) + ":code"}, emailDigest(email+":"+code)).Int()
	if err != nil {
		return err
	}
	if valid != 1 {
		return ErrEmailCode
	}
	return nil
}
