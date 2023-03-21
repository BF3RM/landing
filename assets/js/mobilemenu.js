document.addEventListener("DOMContentLoaded", function() {
    const toggle = document.getElementById('mobile_menu_toggle');
    const menu = document.getElementById('mobile_menu');
    const scrollToTopButton = document.getElementById('scroll_to_top_button');
    
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

    scrollToTopButton.addEventListener("click", function(e) {
        e.preventDefault();
        document.documentElement.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    window.addEventListener("scroll", function() {
        if (document.documentElement.scrollTop > 120) {
            scrollToTopButton.classList.add("show");
        } else {
            scrollToTopButton.classList.remove("show");
        }
    });
});
