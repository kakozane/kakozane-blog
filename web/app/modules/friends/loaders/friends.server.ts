import { getFriends } from "../api/friends.server";

export async function loadFriends() { return getFriends(); }
