package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type SSOTicket struct {
	UserID    int64  `json:"userId"`
	Version   int    `json:"version"`
	SourceKey string `json:"sourceKey"`
}

func (r *AuthRepository) SaveSSOTicket(ctx context.Context, ticket, sourceScope, sourceToken, targetScope, targetOrigin string, user User) error {
	data, err := json.Marshal(SSOTicket{user.ID, user.SessionVersion, sessionKey(sourceScope, sourceToken)})
	if err != nil {
		return err
	}
	return r.redis.Set(ctx, ssoTicketKey(ticket, targetScope, targetOrigin), data, time.Minute).Err()
}

func (r *AuthRepository) ConsumeSSOTicket(ctx context.Context, ticket, targetScope, targetOrigin string) (SSOTicket, error) {
	// GETDEL 原子消费，目标身份与域名参与键计算，错误目标不能使用凭证。
	data, err := r.redis.GetDel(ctx, ssoTicketKey(ticket, targetScope, targetOrigin)).Bytes()
	if err != nil {
		return SSOTicket{}, err
	}
	var value SSOTicket
	if err := json.Unmarshal(data, &value); err != nil {
		return SSOTicket{}, err
	}
	// 来源退出或过期后，尚未使用的凭证也不能继续登录。
	session, err := r.redis.Get(ctx, value.SourceKey).Result()
	if err != nil {
		return SSOTicket{}, err
	}
	if session != fmt.Sprintf("%d:%d", value.UserID, value.Version) {
		return SSOTicket{}, redis.Nil
	}
	return value, nil
}

func ssoTicketKey(ticket, scope, origin string) string {
	hash := sha256.Sum256([]byte(scope + "\n" + origin + "\n" + ticket))
	return "sso:ticket:" + hex.EncodeToString(hash[:])
}
