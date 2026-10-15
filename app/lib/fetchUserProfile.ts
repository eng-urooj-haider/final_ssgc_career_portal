import { useQuery } from "@tanstack/react-query";
import api from "./api"

async function fetchUserProfile() {
  const res = await api.get("/api/user_profile", { withCredentials: true });
  return res.data.profile;
}

function useUserProfile() {
  return useQuery({ queryKey: ["profile_data"], queryFn: fetchUserProfile ,  staleTime: 5 * 60 * 1000,  });
}
export default  useUserProfile