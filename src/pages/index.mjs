import home from './home.mjs';
import rooms from './rooms.mjs';
import guide from './guide.mjs';
import { mapPage, routePage } from './map.mjs';
import { timetable, life, access, faq, about } from './misc.mjs';
import notfound from './notfound.mjs';

export const pages = [home, mapPage, routePage, rooms, guide, timetable, life, access, faq, about, notfound];
