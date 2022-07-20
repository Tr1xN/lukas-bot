import { Keyboard } from "grammy";

const requestContact = new Keyboard()
    .requestContact('📞Надіслати номер телефону')

const mainMenu = new Keyboard()
    .text('🛒Зробити замовлення')
    .text('ℹ️Інформація').row()
    .text("🆘Зв'язок з менеджером");

const cakeCategorys = new Keyboard()
    .text('🛍️Кошик').row()
    .text('Торти "Ексклюзив"')
    .text('Тістечка').row()
    .text('Пряники')
    .text('Печиво').row()
    .text('⬅️Головне меню');

export { requestContact, mainMenu, cakeCategorys }