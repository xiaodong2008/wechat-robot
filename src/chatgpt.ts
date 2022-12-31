import axios from "axios";

/*
 * How does this work?
 *
 * 1. Send message to https://xxx/chatgpt/ask.php
 * 2. https://xxx/chatgpt/ask.php will set ./answer.txt to "null" and set ./ask.txt to the message
 * 3. Tampermonkey will get https://xxx/chatgpt/answer.txt every 1 second, if the answer is not "null", then it will ask chatGPT
 * 4. When chatGPT replied, tampermonkey will send the answer to https://xxx/chatgpt/answer.php
 * 5. https://xxx/chatgpt/answer.php will set ./answer.txt to the answer
 * 6. replyMessage() will get the answer from https://xxx/chatgpt/answer.txt each 1 second, if the answer is not "null", then it will return the answer
 */


axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

async function replyMessage(contact, content) {
    return new Promise((resolve) => {
        console.log(`Ask chatgpt: ${content}`)
        // send https://xxx/chatgpt/ask.php to ask
        axios.post('https://xxx/chatgpt/ask.php', {
            ask: content
        }).catch(function (error) {
            console.log(error);
            throw "Failed to send message: " + error;
        }).then( function () {
            const waitReply = setInterval(() => {
                // get https://xxx/chatgpt/answer.txt to get answer, if "null" then wait
                axios.get('https://xxx/chatgpt/answer.txt', {responseType: "text"}).then(function (response) {
                    let result = response.data
                    if (result != "null") {
                        clearInterval(waitReply);
                        resolve(String(result));
                    }
                })
            }, 1000);
        })
    })
}

export default replyMessage;
