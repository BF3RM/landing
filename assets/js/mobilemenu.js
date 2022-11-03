document.addEventListener("DOMContentLoaded", function() {
    const toggle = document.getElementById('mobile_menu_toggle');
    const menu = document.getElementById('mobile_menu');

    toggle.addEventListener("click", function(e) {
        e.preventDefault();
        menu.classList.toggle('show');
    });

    const elements = document.querySelectorAll('#mobile_menu a');
    elements.forEach(element => {
        element.addEventListener("click", function(event) {
            menu.classList.toggle('show');
        });
    });
});
