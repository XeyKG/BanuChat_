import assert from "node:assert/strict";
import test from "node:test";

import { ConversationActivityCoordinator } from "../src/http/conversation-activity.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("message activity excludes message and delete only for its conversation", () => {
  const activity = new ConversationActivityCoordinator();
  assert.equal(activity.tryBeginMessage(A), true);
  assert.equal(activity.tryBeginMessage(A), false);
  assert.equal(activity.tryBeginDelete(A), false);
  assert.equal(activity.tryBeginMessage(B), true);
  activity.endMessage(A);
  assert.equal(activity.tryBeginDelete(A), true);
  activity.endDelete(A);
  activity.endMessage(B);
});

test("concurrent deletes remain allowed and exclude messages until all end", () => {
  const activity = new ConversationActivityCoordinator();
  assert.equal(activity.tryBeginDelete(A), true);
  assert.equal(activity.tryBeginDelete(A), true);
  assert.equal(activity.tryBeginMessage(A), false);
  activity.endDelete(A);
  assert.equal(activity.tryBeginMessage(A), false);
  activity.endDelete(A);
  assert.equal(activity.tryBeginMessage(A), true);
  activity.endMessage(A);
});
