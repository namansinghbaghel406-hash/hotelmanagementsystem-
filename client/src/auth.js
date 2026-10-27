export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export const saveSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const updateStoredUser = (user) => localStorage.setItem("user", JSON.stringify(user));

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const homeFor = (user) =>
  !user ? "/" : user.userType === "Admin" ? "/admin" : user.userType === "Staff" ? "/staff" : "/user";
