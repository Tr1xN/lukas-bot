import { Bot, Keyboard, InlineKeyboard, session } from 'grammy';
import dotenv from 'dotenv';
import moment from 'moment';

import { connectToMongo, createUser, findUser } from './db/index.js';
import { mainMenu, cakeCategorys, requestContact } from './keyboards/markup/index.js';
import { deliveryChoose, infoKeyboard, clearHelp, help, orderConfirm, emptyKeyboard, productMenu, cartConfirm, paymentType } from './keyboards/inline/index.js';
import { cakesMenuUpdate, nextPage, prevPage, createOrder, sMail } from './customFuncs.js';
import Calendar from './calendar.js';

import cakeModel from './db/models/cake.model.js';
import userModel from './db/models/user.model.js';
import optionsModel from './db/models/options.model.js';

dotenv.config();
moment.locale('uk');


connectToMongo(process.env.MONGO_URI);
let calendarParams = {}
if (moment().hours() < 13) {
    calendarParams = { minDate: moment().subtract('day', 1), maxDate: new Date().setMonth(new Date().getMonth() + 3) };
}
else {
    calendarParams = { minDate: moment(), maxDate: new Date().setMonth(new Date().getMonth() + 3) };
}

const calendar = new Calendar(calendarParams)

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Bot(BOT_TOKEN);
const managerPhoneNum = '+380981234516';

function initial() {
    return { product: {}, cart: [], order: {}, currentCategory: 'Торти "Ексклюзив"', waitDeliveryPoint: false };
}
bot.use(session({ initial }));

bot.on('msg:contact', async ctx => {
    createUser({ firstName: ctx.from.first_name, phoneNumber: ctx.message.contact.phone_number, _id: ctx.from.id })
    ctx.reply('Привіт, ' + ctx.from.first_name + '!')
    await sleep(1)
    ctx.reply('Ласкаво просимо до WOW чат-боту!☺')
    await sleep(1)
    ctx.reply('Використовуй меню, для навігації⬇', { reply_markup: { resize_keyboard: true, keyboard: mainMenu.build() } })
})

bot.on('msg', async ctx => {
    const product = ctx.session.product;
    const cart = ctx.session.cart;
    const currentCategory = ctx.session.currentCategory;

    if (await findUser(ctx.from.id) === null)
        ctx.reply('❗️Для роботи з ботом необхідно відправити свій номер телефону❗️\n\n🍬 Натисніть на кнопку "Надіслати номер телефону". Якщо така кнопка не відображається, натисніть на іконку 🎛 в полі повідомлення.', { reply_markup: { resize_keyboard: true, keyboard: requestContact.build() } })
    else {
        let text = ctx.message.text
        if (text == '/start') {
            ctx.reply('Привіт, ' + ctx.from.first_name + '!')
            await sleep(1)
            ctx.reply('Ласкаво просимо в магазин Lukas!☺')
            await sleep(1)
            ctx.reply('Використовуй меню, для навігації⬇', { reply_markup: { resize_keyboard: true, keyboard: mainMenu.build() } })
        }
        if (text == '🛒Зробити замовлення')
            ctx.reply('Меню товарів:', { reply_markup: { resize_keyboard: true, keyboard: cakeCategorys.build() } })
        if (text == '🛍️Кошик') {
            if (cart[0] == undefined) {
                ctx.reply('Ваш кошик порожній')
            }
            else {
                let cartList = '';
                ctx.session.order.price = 0;
                for (let i = 0; i < cart.length; i++) {
                    let prefix = '';
                    if (cart[i].category == 'Торти "Ексклюзив"') {
                        prefix = "Торт "
                    }
                    else if (cart[i].category == 'Тістечка') {
                        prefix = "Тістечка "
                    }
                    else if (cart[i].category == 'Пряники') {
                        prefix = "Пряники "
                    }
                    else if (cart[i].category == 'Печиво') {
                        prefix = "Печиво "
                    }
                    ctx.session.order.price += cart[i].price;
                    cartList += `${prefix + cart[i].cake} (${cart[i].price} грн.);\n`
                }
                ctx.reply(`Товари у вашому кошику: ${cart.length}\n\nВаш кошик:\n${cartList}\nВсього до сплати: ${ctx.session.order.price} грн.\nПри замовленні від 500 грн - доставка безкоштовна`, { reply_markup: cartConfirm })
            }
        }
        if (text == 'ℹ️Інформація')
            ctx.reply('Wow tort. Україна, м. Кременчук, вул. Чкалова 186', { reply_markup: infoKeyboard })
        if (text == '⭐Залишити відгук')
            ctx.reply('Отправте фото чтобы оставить отзыв: (пока не работает)')

        if (text == 'Торти "Ексклюзив"') {
            await ctx.reply('Торти "Ексклюзив":')
            ctx.session.currentCategory = 'Торти "Ексклюзив"'
            cakesMenuUpdate(ctx, { category: text })
        }
        if (text == 'Тістечка') {
            await ctx.reply('Тістечка:')
            ctx.session.currentCategory = 'Тістечка'
            cakesMenuUpdate(ctx, { category: text })
        }
        if (text == 'Пряники') {
            await ctx.reply('Пряники:')
            ctx.session.currentCategory = 'Пряники'
            cakesMenuUpdate(ctx, { category: text })
        }
        if (text == 'Печиво') {
            await ctx.reply('Печиво:')
            ctx.session.currentCategory = 'Печиво'
            cakesMenuUpdate(ctx, { category: text })
        }

        if (text == "🆘Зв'язок з менеджером") {
            ctx.reply("Бажаєте зв'язатися з менеджером та додатково проконсультуватися? (Зв'язатися з менеджером можно тільки у будні, з 9:00 до 17:00)", { reply_markup: clearHelp })
        }
        if (text == '⬅️Головне меню') {
            ctx.reply('Головне меню:', { reply_markup: { resize_keyboard: true, keyboard: mainMenu.build() } })
        }
        if (text == '⬅️Категорії') {
            ctx.reply('Категорії:', { reply_markup: { resize_keyboard: true, keyboard: cakeCategorys.build() } })
        }

        cakeModel.findOne({ name: text }).then(async cake => {
            if (cake != null) {
                ctx.session.product.cake = text
                ctx.session.product.price = cake.price
                ctx.session.cart.push({ cake: product.cake, price: product.price, category: cake.category })
                ctx.reply('Товар додано в кошик', { reply_markup: productMenu })
            }
        })
        if (text == 'Наступна➡️') {
            nextPage(ctx, currentCategory)
        }
        if (text == '⬅️Попередня') {
            prevPage(ctx, currentCategory)
        }

        if (ctx.session.waitDeliveryPoint) {
            ctx.session.order.deliveryPoint = text;
            await ctx.reply('Ваша ардеса: ' + text, { reply_markup: { resize_keyboard: true, keyboard: cakeCategorys.build() } })
            ctx.reply('Оберіть дату вивезення:', { reply_markup: calendar.getCalendarKeyboard() })
            ctx.session.waitDeliveryPoint = false;
        }
    }
})

bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data;
    const cart = ctx.session.cart;
    const order = ctx.session.order;
    const product = ctx.session.product;

    if (data == 'delete') {
        ctx.editMessageReplyMarkup({ reply_markup: emptyKeyboard });
    }

    if (data == 'openCart') {
        let cartList = '';
        ctx.session.order.price = 0;
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].category == 'Торти "Ексклюзив"') {
                cartList += "Торт "
            }
            else if (cart[i].category == 'Тістечка') {
                cartList += "Тістечка "
            }
            else if (cart[i].category == 'Пряники') {
                cartList += "Пряники "
            }
            else if (cart[i].category == 'Печиво') {
                cartList += "Печиво "
            }
            ctx.session.order.price += cart[i].price;
            cartList += `${cart[i].cake} (${cart[i].price} грн.);\n`
        }
        ctx.deleteMessage();
        ctx.reply(`Товари у вашому кошику: ${cart.length}\n\nВаш кошик:\n${cartList}\nВсього до сплати: ${ctx.session.order.price} грн.\nПри замовленні від 500 грн - доставка безкоштовна`, { reply_markup: cartConfirm })
    }

    if (data == 'orderCart') {
        ctx.deleteMessage();
        let cartList = '';
        ctx.session.order.price = 0;
        ctx.session.order.cartArray = [];
        for (let i = 0; i < cart.length; i++) {
            ctx.session.order.price += cart[i].price;
            ctx.session.order.cartArray.push(`${cart[i].cake} (${cart[i].price} грн.)`)
            cartList += `${cart[i].cake} (${cart[i].price} грн.);\n`
        }
        ctx.session.order.cart = cartList;
        JSON.stringify(order.cartArray);
        ctx.reply('Оберіть тип оплати:', { reply_markup: paymentType })
    }

    if(data == 'cash'){
        ctx.session.order.paymentType = 'Готівка';
        ctx.editMessageText('Оберіть спосіб отримання замовлення:', { reply_markup: deliveryChoose })
    }

    if(data == 'cashless'){
        ctx.session.order.paymentType = 'Безготівковий';
        ctx.editMessageText('Наші реквізити: 0000 0000 0000 0000')
        ctx.reply('Оберіть спосіб отримання замовлення:', { reply_markup: deliveryChoose })
    }

    if (data == 'clearCart') {
        ctx.deleteMessage();
        ctx.reply('🗑️Кошик пустий')
        ctx.session.cart = [];
    }

    if (data == 'deleteProduct') {
        ctx.deleteMessage();
        ctx.session.cart.shift();
        ctx.reply('Товар видалено з кошику')
    }

    if (data == 'delivery') {
        ctx.deleteMessage()
        ctx.reply('Вкажіть адрессу доставки:', { reply_markup: { remove_keyboard: true } })
        ctx.session.waitDeliveryPoint = true
    }

    if (data == 'pickup') {
        ctx.session.order.deliveryPoint = 'Самовивіз'
        ctx.reply('Оберіть дату вивезення:', { reply_markup: calendar.getCalendarKeyboard() })
    }

    if (data == 'helpNo') {
        if (order.date == undefined)
            ctx.editMessageText('Підтвердіть замовлення:\n\nКошик:\n' + order.cart + '\nДата отримання замовлення: (не вказана)' + '\nВсього до сплати: ' + order.price + 'грн\При замовленні від 500 грн - доставка безкоштовна', { reply_markup: orderConfirm })
        else
            ctx.editMessageText('Підтвердіть замовлення:\n\nКошик:\n' + order.cart + '\nДата отримання замовлення: ' + order.date + '\nВсього до сплати: ' + order.price + 'грн\nПри замовленні від 500 грн - доставка безкоштовна', { reply_markup: orderConfirm })
    }
    /*if (data == 'liqpay')
        if (liqpayment(config.liqpayPublicKey, config.liqpayPrivateKey, order.price) == 'success')
            createOrder(ctx, order, ctx.from.id)*/
    if (data == 'bought') {
        await userModel.findOne({ _id: ctx.from.id }).then(user => {
            ctx.session.order.phoneNumber = user.phoneNumber
        })
        await createOrder(ctx, order)
        await optionsModel.findOne({}).then(async options => {
            sMail(options.mail, ctx.from.first_name + ' (' + ctx.from.id + ')', 'Кошик:\n' + order.cart + '\nВсього до сплати: ' + order.price + ' грн\n' + 'Точка вивезення: ' + order.deliveryPoint + '\nДата отримання замовлення: ' + order.date + '\nНомер телефону: ' + order.phoneNumber + '\nСпосіб оплати: ' + order.paymentType)
        })
        ctx.session.order = {}
        ctx.session.cart = []
    }
    if (data == 'backToMainMenu') {
        ctx.editMessageReplyMarkup({ reply_markup: emptyKeyboard })
        ctx.reply('Головне меню:', { reply_markup: { resize_keyboard: true, keyboard: mainMenu.build() } })
    }
    if (data == 'callHelp') {
        ctx.editMessageReplyMarkup({ reply_markup: { remove_keyboard: true } })
        if ((moment(new Date).day() < 6) && (moment(new Date, moment.TIME).isAfter(moment(new Date, moment.TIME).startOf('day').add(17, 'h')) || moment(new Date, moment.TIME).isBefore(moment(new Date, moment.TIME).startOf('day').add(9, 'h')))) {
            ctx.reply('Ваш поточний час: ' + moment(new Date, moment.TIME).format('HH:mm') + '\nМенеджер може підключитись тільки у будні, з 9:00 до 17:00', { reply_markup: { remove_keyboard: true } })
        }
        else {
            await ctx.deleteMessage(ctx.update.callback_query.message.message_id)
            await ctx.replyWithContact(managerPhoneNum, 'Оператор').catch(async err => { await ctx.reply('Оператор:\n' + managerPhoneNum) })
        }
    }
    if (data == 'closeKeyboard') {
        ctx.editMessageReplyMarkup({ reply_markup: emptyKeyboard })
    }

    if (data === 'null') {
        return;
    }
    else if (data === 'prev') {
        ctx.editMessageReplyMarkup({ reply_markup: calendar.getPrevMonth() });
    }
    else if (data === 'next') {
        ctx.editMessageReplyMarkup({ reply_markup: calendar.getNextMonth() });
    }
    else if (moment(data).isValid()) {
        ctx.deleteMessage();
        ctx.session.order.date = moment(data).format('DD-MM-YYYY');
        ctx.reply("Бажаєте зв'язатися з менеджером та додатково проконсультуватися? (Зв'язатися з менеджером можно тільки у будні, з 9:00 до 17:00)", { reply_markup: help })
    }
    await ctx.answerCallbackQuery();
})

bot.start()

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms * 1000));