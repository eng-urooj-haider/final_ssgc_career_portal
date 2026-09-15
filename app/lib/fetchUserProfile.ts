import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchUserProfile() {
  const res = await axios.get("/api/user_profile", { withCredentials: true });
  return res.data.profile;
}

function useUserProfile() {
  return useQuery({ queryKey: ["profile_data"], queryFn: fetchUserProfile });
}
export default  useUserProfile