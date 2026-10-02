package repository

import (
	"context"
	"encoding/json"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/redis/go-redis/v9"
)

const publishedChannel = "blog:published"

type EventRepository struct{ redis *redis.Client }

func NewEventRepository(client *redis.Client) *EventRepository {
	return &EventRepository{redis: client}
}

func (r *EventRepository) Publish(ctx context.Context, event model.PublishedEvent) error {
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return r.redis.Publish(ctx, publishedChannel, body).Err()
}

func (r *EventRepository) PublishSite(ctx context.Context) error {
	return r.redis.Publish(ctx, publishedChannel, "site").Err()
}

func (r *EventRepository) Subscribe(ctx context.Context) (<-chan string, func(), error) {
	subscription := r.redis.Subscribe(ctx, publishedChannel)
	if _, err := subscription.Receive(ctx); err != nil {
		_ = subscription.Close()
		return nil, nil, err
	}
	incoming := subscription.Channel()
	messages := make(chan string)
	go func() {
		defer close(messages)
		for {
			select {
			case message, ok := <-incoming:
				if !ok {
					return
				}
				select {
				case messages <- message.Payload:
				case <-ctx.Done():
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	return messages, func() { _ = subscription.Close() }, nil
}

// A visitor may have several tabs. A shared member keeps them counted once;
// disconnected browsers disappear after 75 seconds, without racing tab closes.
var presenceScript = redis.NewScript(`
local now = redis.call('TIME')
local seconds = tonumber(now[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', seconds - 75)
redis.call('ZADD', KEYS[1], seconds, ARGV[1])
redis.call('EXPIRE', KEYS[1], 150)
return redis.call('ZCARD', KEYS[1])
`)

func (r *EventRepository) TouchVisitor(ctx context.Context, visitor string) (int64, error) {
	return presenceScript.Run(ctx, r.redis, []string{"blog:online-visitors"}, visitor).Int64()
}
