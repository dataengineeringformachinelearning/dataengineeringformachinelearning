/**
 * Blog slider for featured notes on /blog/
 * Scroll-snap carousel with keyboard navigation.
 */
(() => {
  const SLIDER_SELECTOR = ".blog-slider-track";
  const DOT_SELECTOR = ".blog-slider-dot";
  const PREV_BTN = "#blog-slider-prev";
  const NEXT_BTN = "#blog-slider-next";

  const initSlider = () => {
    const track = document.querySelector(SLIDER_SELECTOR);
    if (!track) return;
    const slides = Array.from(track.children);
    if (slides.length === 0) return;

    const dots = document.querySelectorAll(DOT_SELECTOR);
    const prevBtn = document.querySelector(PREV_BTN);
    const nextBtn = document.querySelector(NEXT_BTN);

    let currentIndex = 0;

    const goToSlide = (index) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      const slideWidth = track.offsetWidth;
      track.scrollTo({
        left: clamped * slideWidth,
        behavior: "smooth",
      });
      currentIndex = clamped;
      updateDots();
    };

    const updateDots = () => {
      dots.forEach((dot, i) => {
        dot.classList.toggle("blog-slider-dot-active", i === currentIndex);
        dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
      });
    };

    const onScroll = () => {
      if (track.offsetWidth > 0) {
        const newIndex = Math.round(track.scrollLeft / track.offsetWidth);
        if (newIndex !== currentIndex) {
          currentIndex = newIndex;
          updateDots();
        }
      }
    };

    // Button handlers
    if (prevBtn) {
      prevBtn.addEventListener("click", () => goToSlide(currentIndex - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => goToSlide(currentIndex + 1));
    }

    // Dot handlers
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => goToSlide(i));
    });

    // Keyboard navigation
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      }
    });

    // Scroll tracking
    track.addEventListener("scroll", onScroll);

    // Setup
    track.setAttribute("tabindex", "0");
    updateDots();
  };

  // Initialize when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSlider);
  } else {
    initSlider();
  }
})();
