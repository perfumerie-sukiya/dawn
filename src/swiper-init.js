import { register } from 'swiper/element';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';

register();

const swiperEls = document.querySelectorAll('swiper-container');

swiperEls.forEach((swiperEl) => {
  if (swiperEl) {
    const params = {
      modules: [Navigation, Pagination, EffectFade, Autoplay],
      injectStylesUrls: [
        `https://cdn.jsdelivr.net/npm/swiper@${process.env.SWIPER_VERSION}/modules/navigation-element.css`,
        `https://cdn.jsdelivr.net/npm/swiper@${process.env.SWIPER_VERSION}/modules/pagination-element.css`,
        `https://cdn.jsdelivr.net/npm/swiper@${process.env.SWIPER_VERSION}/modules/effect-fade-element.css`,
      ],
      pagination: {
        clickable: true,
      }
    }

    Object.assign(swiperEl, params)
    swiperEl.initialize()
  }
})
