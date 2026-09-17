#!/bin/bash
# Test paiement Paddle sandbox -> verifie flux webhook -> cle API -> email
# Usage: ./test-paddle.sh <email_test>
EMAIL="${1:-diengamine.htl@gmail.com}"
echo "Test webhook Paddle pour: $EMAIL"
curl -sS -w "\nHTTP=%{http_code}\n" -X POST \
  "https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/quick-task" \
  -H "Content-Type: application/json" \
  -d "{\"event_type\":\"transaction.completed\",\"data\":{\"id\":\"txn_test_001\",\"status\":\"completed\",\"customer\":{\"email\":\"$EMAIL\"},\"items\":[{\"price_id\":\"pri_01m2p3nq2yehqy4v07kc9dtqk3\"}]}}"
