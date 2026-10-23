// Full page load, not a client-side push: it drops every IndexedDB connection
// (a delete blocked by one only completes then) and boots the empty profile
// from scratch instead of the reset in-memory store.
export const reloadToRegistration = () => {
  window.location.replace('/auth/registration');
};
