# PHOTO GUIDE — Профессиональное портфолио

Сейчас в репозитории нет реальных фотографий Павла. Чтобы сайт стал готовым портфолио для кастинга, добавьте **свои недавние, немодифицированные фотографии**.

## Приоритет кадров
1. `assets/photos/hero.webp` — вертикальный главный портрет, по грудь или пояс, лицо открыто, пространство в кадре под типографику. 1600–2200 px по длинной стороне, до ~500 KB–1 MB.
2. `assets/photos/headshot-front.webp` — анфас, нейтральный свет, естественная кожа, без ретуши изменения лица.
3. `assets/photos/headshot-threequarter.webp` — поворот ¾, мягкий дневной свет.
4. `assets/photos/full-body.webp` — полный рост, прилегающая одежда, нейтральная поза; без искажения пропорций.
5. `assets/photos/profile.webp` — профиль, нейтральный фон.
6. `assets/photos/athletic.webp` — естественный спортивный кадр, движения/форма.
7. `assets/photos/editorial.webp` — fashion/editorial образ, допускается художественная обработка, но без подмены лица.
8. `assets/photos/lifestyle.webp` — естественная коммерческая подача.

Избегайте дублирующих ракурсов. Оптимально 6–12 сильных и разноплановых снимков. Хороший кастинг-портфель начинается с честных headshot и full-body.

## Подключение фотографий
1. Загрузите изображения в `assets/photos/` через GitHub (Add file → Upload files), желательно WebP или JPEG.
2. В `data/media.js` установите `window.HERO_IMAGE = "assets/photos/hero.webp";`.
3. Заполните `window.MODEL_PHOTOS = [...]` настоящими кадрами:
```js
window.MODEL_PHOTOS = [
  {
    src:"assets/photos/headshot-front.webp",
    category:"portraits",
    alt:{ru:"Павел Марков, портрет анфас",en:"Pavel Markov, front-facing portrait",zh:"帕维尔·马尔科夫正面肖像"},
    caption:"PORTRAIT / 01",
    position:"50% 20%"
  },
  {
    src:"assets/photos/athletic.webp",
    category:"athletic",
    alt:{ru:"Павел Марков, спортивная съёмка",en:"Pavel Markov, athletic session",zh:"帕维尔·马尔科夫运动写真"},
    caption:"ATHLETIC / 02",
    position:"50% 35%"
  }
];
```
Фильтры появятся автоматически по имеющимся категориям; порядок равен порядку в массиве. Используйте только категории `portraits`, `editorial`, `athletic`, `commercial`, `cinematic`.

## Видео
Положите MP4/WebM в `assets/video/` и добавьте в `MODEL_VIDEOS`. Реальное селф-тейп видео, обычное контент-видео и актёрское showreel называйте корректно.

## Для актуализации данных
- Уточнить вес и талию в день кастинга, размер одежды, обуви, грудь, бёдра.
- Уточнить доступность командировок/релокации и языки для съёмок, если понадобится.
- Указать подтверждённый email для букинга или личный публичный Telegram/Instagram в `data/profile.js`.
- Подтвердить квалификационные спортивные звания перед публикацией. Сейчас звания опущены.

## Важное
Не добавляйте в публичный репозиторий паспорт, адрес, телефон без согласия, секреты и точную дату рождения.

## Archive is not agency digitals
The website includes `MODEL_ARCHIVE` in `data/media.js`, drawn from existing user-controlled MarkovMade materials. Some visuals are styled/processed, may be older and need not accurately show current appearance or measurements. Do not move them into `MODEL_PHOTOS` or the printable comp card automatically. New authentic photos should include an updated, unfiltered portrait, left and right profile, full-length front/back and current measurements. Only those belong in the official casting set.
