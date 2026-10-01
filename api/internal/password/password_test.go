package password

import "testing"

func TestHashAndVerify(t *testing.T) {
	hash, err := Hash("correct horse battery staple")
	if err != nil || !Verify("correct horse battery staple", hash) {
		t.Fatalf("valid password rejected: %v", err)
	}
	if Verify("wrong password", hash) || Verify("correct horse battery staple", "invalid") {
		t.Fatal("invalid password accepted")
	}
}
