import { FriendsList } from "../../_components/FriendsList";
import { FriendRequests } from "../../_components/friend-requests";

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <FriendRequests />
      <FriendsList />
    </div>
  );
}
