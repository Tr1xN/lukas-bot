import { Keyboard } from "grammy";

const requestContact = new Keyboard()
    .requestContact('📞Надіслати номер телефону')

const mainMenu = new Keyboard()
    .text('🛒Зробити замовлення')
    .text('ℹ️Информація').row()
    .text('🆘Потрібна допомога');

const cakeCategorys = new Keyboard()
    .text('Торти "Ексклюзив"').row()
    .text('Тістечка')
    .text('Пряники')
    .text('Печиво').row()
    .text('⬅️Головне меню');

export { requestContact, mainMenu, cakeCategorys };