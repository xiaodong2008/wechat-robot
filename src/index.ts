import {WechatyBuilder} from "wechaty";
import qrcodeTerminal from "qrcode-terminal";
import pc from "picocolors";
import axios from "axios";

let active = JSON.parse(fs.readFileSync("./active.json", "utf-8"));
let config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
let secret = JSON.parse(fs.readFileSync("./secret.json", "utf-8"));
import chatgpt from "./chatgpt";
import fs from "fs";
import crypto from "crypto";

const b = `\n--------------------------\n`
/*
 * secret.json
 * {
 *   "translate": {
 *      "appid": "your baidu translate appID",
 *      "key": "your baidu translate key"
 *    },
 *    "weather": {
 *       "key": "your visualcrossing weather key"
 *     }
 *  }
 */

const wechatBot = WechatyBuilder.build({
    name: "wechat-bot",
    puppet: "wechaty-puppet-wechat",
    puppetOptions: {
        uos: true,
    }
})

wechatBot.on("scan", (qrcode) => {
    qrcodeTerminal.generate(qrcode);
    const qrcodeImageUrl = [
        "https://api.qrserver.com/v1/create-qr-code/?data=",
        encodeURIComponent(qrcode),
    ].join("");
    console.log(qrcodeImageUrl);
})

wechatBot.on("login", (user) => {
    console.log(user);
    // @ts-ignore
    console.log(`${user.name()} has logged in`);
})

wechatBot.on("logout", (user) => {
    console.log(`${user} has logged out`)
})

wechatBot.on("ready", () => {
    console.log("wechat-bot is ready")
    // new cmd
})

// @ts-ignore
wechatBot.on("message", receiveMsg);

let stopWork = false
let sendMsgTemp = "";
const questionWait: Array<any> = [];
let waitingReply: any = null;
let waitingReplyId: any = null;

interface database {
    askQuestionTip: Array<any>,
    disableQuestion: Array<any>,
    closeUnknownReply: Array<any>,
}

const db: database = {
    "askQuestionTip": [],
    "disableQuestion": [],
    "closeUnknownReply": []
}

setInterval(() => {
    // reload
    config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
    active = JSON.parse(fs.readFileSync("./active.json", "utf-8"));
    secret = JSON.parse(fs.readFileSync("./secret.json", "utf-8"));
}, 5000)

async function receiveMsg(msg) {
    let msgText = msg.text();
    const userId = msg.talker().payload.id;

    // adminPanel

    const check = () => {
        // if not myself
        if (!msg.self()) {
            say(msg, "Error 403: Permission denied");
            return false;
        }
        return true;
    }

    let adminSend = "";

    if (msgText === "admin" && check()) {
        adminSend = `管理员面版${b}` +
            `关闭服务: adminClose\n` +
            `开启服务: adminOpen\n` +
            `开启功能: adminOpen(name)\n` +
            `关闭功能: adminClose(name)\n` +
            `查看功能: adminList\n` +
            `查看状态: adminStatus\n` +
            `设置自动回复: adminReply(text)\n` +
            `结束服务: adminExit\n`;
    } else if (msgText === "adminClose" && check()) {
        stopWork = true;
        adminSend = `管理员面板${b}已关闭服务`;
        console.log(pc.red("服务被管理员关闭"));
    } else if (msgText === "adminOpen" && check()) {
        stopWork = false;
        adminSend = `管理员面板${b}已开启服务`;
        console.log(pc.green("服务被管理员开启"));
    } else if (msgText.match(/^adminOpen[A-Za-z]+$/) && check()) {
        const module = msgText.slice(9);
        if (active[module] !== undefined) {
            active[module] = true;
            fs.writeFileSync("./active.json", JSON.stringify(active));
            adminSend = `管理员面板${b}已开启功能${module}`;
            console.log(pc.green(`功能${module}被管理员开启`));
        } else {
            adminSend = `管理员面板${b}功能${module}不存在`;
        }
    } else if (msgText.match(/^adminClose[A-Za-z]+$/) && check()) {
        const module = msgText.slice(10);
        if (active[module] !== undefined) {
            active[module] = false;
            fs.writeFileSync("./active.json", JSON.stringify(active));
            adminSend = `管理员面板${b}已关闭功能${module}`;
            console.log(pc.red(`功能${module}被管理员关闭`));
        } else {
            adminSend = `管理员面板${b}功能${module}不存在`;
        }
    } else if (msgText === "adminList" && check()) {
        adminSend = `管理员面板${b}功能列表${b}`;
        for (const key in active) {
            adminSend += `${key}: ${active[key]}\n`;
        }
    } else if (msgText === "adminStatus" && check()) {
        adminSend = `管理员面板${b}服务状态${b}`;
        adminSend += `服务状态: ${!stopWork ? "启动" : "关闭"}`;
        for (const key in active) {
            adminSend += `\n${key}: ${active[key] ? "active" : "close"}`;
        }
    } else if (msgText.match(/^adminReply.*/) && check()) {
        const text = msgText.slice(10);
        if (text === "") {
            config.status.now = "";
            adminSend = `管理员面板${b}已关闭自动回复`;
        } else if (config.status[text] === undefined && text.length && text[0] !== " ") {
            adminSend = `管理员面板${b}状态${text}不存在`;
        } else if (text[0] === " ") {
            adminSend = `管理员面板${b}自动回复已设置为${text.slice(1)}`;
            config.status.now = text.slice(1);
        } else {
            config.status.now = text;
            adminSend = `管理员面板${b}已开启状态${text}的自动回复`;
        }
        fs.writeFileSync("./config.json", JSON.stringify(config));
    } else if (msgText === "adminExit" && check()) {
        adminSend = `管理员面板${b}服务即将结束`;
        console.log(pc.red("管理员结束服务"));
        stopWork = true;
        setTimeout(() => {
            wechatBot.stop();
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }, 1000);
    }
    if (adminSend) say(msg, adminSend);
    if (stopWork) return
    try {
        // check msgText
        if (msgText.indexOf("emoji") !== -1) {
            msgText = "[动画表情]"
        } else if (msgText.match(/^@[a-z0-9]+$/)) {
            msgText = "[图片]"
        } else if (msgText.indexOf("?xml") !== -1) {
            msgText = "[不支持的消息类型]"
        }
        const msgFrom = await msg.talker().alias() || msg.talker().name();
        const selfMsg = msg.self();
        const isGroupMsg = msg.room();
        const groupId = isGroupMsg ? msg.room().id : "";
        let sendMsg = "";


        if (!isGroupMsg) {
            const msgTo = await msg.to().alias() || await msg.to().name();
            console.log(pc.blue(`<${msgFrom} -> ${msgTo}>: ${msgText}`));
        } else {
            const roomName = await msg.room().topic();
            const mentionSelf = await msg.mentionSelf();
            let output = `<${roomName}>[${msgFrom}]: ${msgText}`;
            if (mentionSelf) {
                output = pc.red(output);
            }
            console.log(output);
        }

        if (msgText === sendMsgTemp || msgText.indexOf("[BOT]") !== -1) {
            return sendMsgTemp = "";
        }

        // if it is a math formula and active.calc
        // match -> at least two numbers and one operator
        if (active.calc && msgText.match(/^\d+[+\-*\/()]\d+[+\-*\/()\d]*$/)) {
            sendMsg = `${msgText} = ${eval(msgText)}`;
        } else if (active.weather && (msgText.match(/^[\u4e00-\u9fa5]+天气$/) || msgText.match(/^[A-Za-z ]+ [W|w]eather$/))) {
            // check chinese or english;
            let city = msgText.match(/[\u4e00-\u9fa5]+天气/) ? msgText.match(/[\u4e00-\u9fa5]+天气/)[0].replace("天气", "") : msgText.match(/[A-Za-z ]+ [W|w]eather/)[0].replace(" weather", "");
            const defaultCity = city;
            let lang = msgText.match(/[\u4e00-\u9fa5]+天气/) ? "zh" : "en";
            // baidu translate city
            // get english city
            city = await translate(city);
            // get weather
            // https://weather.visualcrossing.com/
            // VisualCrossingWebServices/rest/services/timeline/
            // <city>/today?unitGroup=metric&key=<secret.key>&contentType=json
            const weatherRes = await axios.get(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}/today?unitGroup=metric&key=${secret.weather.key}&contentType=json`);
            // check err
            // when it doesn't return a json, then it is an error
            try {
                JSON.stringify(weatherRes.data);
            } catch (err) {
                throw `Error when get weather${b}data: ${weatherRes.data}\n${err} -> ${weatherRes.data}`;
            }
            // get weather info
            const weatherInfo = weatherRes.data.days[0];
            const temp = weatherInfo.tempmin + "°C ~ " + weatherInfo.tempmax + "°C";
            let weather = weatherInfo.conditions;
            // if lang is zh, translate weather
            if (lang === "zh") {
                weather = await translate(weather, false);
            }
            let tips
            if (weatherInfo.tempmin < 16) {
                tips = config.weather.cold[lang];
            } else if (weatherInfo.tempmax > 30) {
                tips = config.weather.hot[lang];
            } else {
                tips = "--"
            }
            sendMsg = lang === "zh" ?
                `今日${defaultCity}天气${b}今日天气: ${weather}\n今日温度: ${temp}\n温馨提示: ${tips}` :
                `Today's ${city} Weather${b}Today's weather: ${weather}\nToday's temperature: ${temp}\nTips: ${tips}`;
        } else if (active.translate && msgText.match(/^翻译.+$/)) {
            // translate
            const text = msgText.replace("翻译", "");
            const translateRes = await translate(text, false);
            sendMsg = `翻译文字${b}${translateRes}`;
        } else if (active.chatGPT && (((msgText[msgText.length - 1] === "?" || msgText[msgText.length - 1] === "？" || config.askKeyword.some((keyword) => msgText[msgText.length - 1] === keyword)) && msgText.length > 3) || msgText === "继续" || msgText.indexOf("问:") === 0)) {
            if (db.disableQuestion.indexOf(userId) === -1 && db.disableQuestion.indexOf(groupId) === -1) {
                if (db.askQuestionTip.indexOf(userId) === -1) {
                    await say(msg, `使用提示${b}问答模式已启用，当检查到问号或者关键词时，将会自动回复。${b}你可以发送'closeQuestionReply'来在本次的机器人生命周期内关闭问答模式，关闭问答模式后，你可以发送'openQuestionReply'来重新开启问答模式。`);
                    db.askQuestionTip.push(userId);
                }

                if (msgText === "继续") {
                    if (!waitingReply || waitingReply.talker().id !== userId) {
                        sendMsg = "Error 403: Permission denied";
                    } else {
                        await askQuestion(msg, msgText);
                    }
                } else {
                    // check if already waiting for answer
                    // questionWait: Array<{userId: string}>
                    if (questionWait.some((item) => item.talker().payload.id === userId)) {
                        sendMsg = "你目前正处于等待队列中，请等待回复。";
                    } else {
                        say(msg, `你已进入等候队列，目前有${questionWait.length + 1}人在等候回复，你处于第${questionWait.length + 1}位。`, true);
                        await askQuestion(msg, msgText);
                    }
                }
            }
        } else if (msgText === "closeQuestionReply") {
            if (db.disableQuestion.indexOf(userId) === -1)
                db.disableQuestion.push(userId);
            sendMsg = `uid: ${userId}${b}已关闭问答模式`;
        } else if (msgText === "openQuestionReply") {
            if (db.disableQuestion.indexOf(userId) !== -1)
                db.disableQuestion.splice(db.disableQuestion.indexOf(userId), 1);
            if (db.askQuestionTip.indexOf(userId) !== -1)
                db.askQuestionTip.splice(db.askQuestionTip.indexOf(userId), 1);
            sendMsg = `uid: ${userId}${b}已开启问答模式`;
        } else if (msgText === "closeGroupQuestionReply") {
            // is admin or group master
            if (msg?.room()?.owner()?.id === userId || msg.self()) {
                if (db.disableQuestion.indexOf(groupId) === -1)
                    db.disableQuestion.push(groupId);
                sendMsg = `gid: ${groupId}${b}已关闭问答模式`;
            } else {
                sendMsg = `Error 403: Permission denied`;
            }
        } else if (msgText === "openGroupQuestionReply") {
            // is admin or group master
            if (msg?.room()?.owner()?.id === userId || msg.self()) {
                if (db.disableQuestion.indexOf(groupId) !== -1)
                    db.disableQuestion.splice(db.disableQuestion.indexOf(groupId), 1);
                sendMsg = `gid: ${groupId}${b}已开启问答模式`;
            } else {
                sendMsg = `Error 403: Permission denied`;
            }
        } else if (msgText === "close") {
            if (db.closeUnknownReply.indexOf(userId) === -1)
                db.closeUnknownReply.push(userId);
            if (db.disableQuestion.indexOf(userId) === -1)
                db.disableQuestion.push(userId);
            sendMsg = `uid: ${userId}${b}已关闭非必要服务`;
        } else if (msgText === "menu") {
            sendMsg = `菜单${b}` +
                `计算机: 发送'()+-*/'的算式\n` +
                `天气: 发送(城市)天气或者(city)weather来获取当日天气\n` +
                `翻译: 发送翻译(文字)\n` +
                `问答: 在问题后附问号,或者发送'问:(问题)',某些问题可能回答不完整,输入'继续'来继续问答,输入'clear'来重新开始对话${b}` +
                `命令\n` +
                `closeQuestionReply: 关闭问答模式(个人)\n` +
                `openQuestionReply: 开启问答模式(个人)\n` +
                `closeGroupQuestionReply: 关闭群组未知回复(群组,管理员可操作)\n` +
                `openGroupQuestionReply: 开启群组未知回复(群组,管理员可操作)\n` +
                `closeUnknownReply: 关闭未知回复(个人)\n` +
                `close: 关闭非必要服务(个人)`
        } else if (msgText === "closeUnknownReply") {
            if (db.closeUnknownReply.indexOf(userId) === -1)
                db.closeUnknownReply.push(userId);
            sendMsg = `uid: ${userId}${b}已关闭未知消息回复`;
        } else if (!selfMsg && (!isGroupMsg || await msg.mentionSelf())) {
            if (config.status.now) {
                if (config.status[config.status.now])
                    sendMsg = config.status[config.status.now];
                else
                    sendMsg = config.status.now;
            } else if (msgText.indexOf(config.unknown) === -1 && db.closeUnknownReply.indexOf(userId) === -1)
                sendMsg = `${config.unknown}${b}如果你想问我问题，请在问题后面加上问号，且不需要@我。${b}你也可以发送'menu'来查看功能菜单。${b}发送'closeUnknownReply'来关闭本次的机器人生命周期内的未知回复。`;
        }


        if (sendMsg) {
            await say(msg, `${sendMsg}`);
        }
    } catch (err) {
        await say(msg, `There is something error${b}` +
            `${err}`);
    }
}

async function say(msg, send, at = false) {
    const sendto = msg.room() ? msg.room() : msg.self() ? msg.to() : msg.talker();
    if (at)
        send = `@${msg.talker().name()} ${send}`;
    send = `[BOT] ${send}`;
    sendMsgTemp = send;
    return sendto.say(send);
}

async function translate(q, toEn = true) {
    // rand 10000-99999
    const salt = Math.floor(Math.random() * 90000 + 10000);
    // sign = secret.appid + city + salt + secret.key
    const sign = crypto
        .createHash("md5")
        .update(`${secret.translate.appid}${q}${salt}${secret.translate.key}`)
        .digest("hex");
    // https://fanyi-api.baidu.com/api/trans/vip/translate -> q=city&from=auto&to=en&appid=secret.appid&salt=salt&sign=sign
    const res = await axios.get("https://fanyi-api.baidu.com/api/trans/vip/translate", {
        params: {
            q: q,
            from: "auto",
            to: toEn ? "en" : "zh",
            appid: secret.translate.appid,
            salt: salt,
            sign: sign,
        }
    })
    // check err
    if (res.data.error_code) {
        throw `Error when translate -> ${res.data.error_code}:${res.data.error_msg}`;
    } else {
        return res.data.trans_result[0].dst;
    }
}

async function askQuestion(msg, msgText) {
    questionWait.push(msg);
    if (questionWait.length === 1 || msgText === "继续") {
        getQuestion();
    }
}

async function getQuestion() {
    const msg = questionWait[0];
    const msgText = msg.text();
    if (msgText === "继续") {
        say(msg, `正在继续处理你的问题，请稍等`, true);
        clearTimeout(waitingReplyId);
        questionWait.shift();
        // Add to first
        questionWait.unshift(msg);
    }
    const nextPerson = (result) => {
        // send result
        say(msg, result, true);
        say(msg, `如果回答不完整，你可以在10秒内发送'继续'来继续问答，你也可以继续提问，超过10秒后将结束问答。`, true);
        waitingReplyId = setTimeout(() => {
            waitingReplyId = null;
            waitingReply = null;
            // remove first element
            questionWait.shift();
            if (questionWait.length > 0) {
                // send to each user wait for reply
                for (let i = 0; i < questionWait.length; i++) {
                    say(questionWait[i], `目前有${questionWait.length}人在等候回复，你处于第${i + 1}位。`, true);
                }
                getQuestion();
            }
        }, 10000);
        waitingReply = msg;
    }
    try {
        await chatgpt(msg.talker(), msgText).then(nextPerson);
    } catch (err) {
        await say(msg, `There is something error${b}` +
            `${err}`);
        console.log(err)
        nextPerson(`我们在处理你的问题时出现了一些问题，请重新提问。`)
    }
}

wechatBot.start();