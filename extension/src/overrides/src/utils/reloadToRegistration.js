// Extension `utils/reloadToRegistration`. The app path lives in the hash
// (src/router/history.js); a path URL would point at a file that does not
// exist.
export const reloadToRegistration = () => {
  window.history.replaceState(null, '', '#/auth/registration/');
  window.location.reload();
};
