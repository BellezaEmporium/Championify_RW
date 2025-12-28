export default {
  toggleMenu() {
    const menu = document.getElementById('locale_menu');
    if (menu) {
      menu.classList.toggle('hidden');
    }
  },

  selectLocale(value) {
    // Emit event to parent
    this.emit('locale-changed', { locale: value });
    // Close menu
    this.toggleMenu();
  }
};