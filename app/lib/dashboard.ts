

import axios from "axios";
export const UserProfile = () => {
  const user = axios.get("api/user_profile", { withCredentials: true });
  return user;
};
export const GetCities = async () => {
  const res = await axios.get("/api/cities", { withCredentials: true });
  return res.data.cities; // adjust to match your actual API response shape
};
export const GetCountries = async () => {
  const res = await axios.get("/api/countries", { withCredentials: true });
  return res.data.countries; // adjust to match your actual API response shape
};
export const GetExperiences = async () => {
  const res = await axios.get("/api/experiences", { withCredentials: true });
  return res.data.experiences;
};
export async function getQualificationGroups() {
  const res = await axios.get("/api/lookups?type=qualification-groups", {
    withCredentials: true,
  });
  console.log("res", res.data);
  return res.data.data;
}

export async function getQualifications() {
  const res = await axios.get("/api/lookups?type=qualifications", {
    withCredentials: true,
  });
  console.log("res", res.data);
  return res.data.data;
}

export async function getInstitutes() {
  const res = await axios.get("/api/lookups?type=institutes", {
    withCredentials: true,
  });
  console.log("res", res.data);
  return res.data.data;
}

