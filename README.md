# Wechat-Bot

这是一个基于wechaty开发的微信机器人，内置了一些常用的功能。

## 内置功能

- 自动回复
- 管理员面板
- 天气查询
- 翻译
- 计算机
- ChatGPT
- 等等

## 使用方法

1. Git Clone

```bash
git clone https://github.com/dy-xiaodong2022/wechat-robot.git
```

2. 安装依赖

```bash
npm install
```

3. 修改配置文件 `secret.json`
```text
{
  "translate": {
    "appid": "your baidu translate appID",
    "key": "your baidu translate key"
  },
  "weather": {
    "key": "your visualcrossing weather key"
  }
}
```

4. 启动

```bash
npm run dev
```

## 温馨提醒

机器人虽好，但需注意不要拿自己大号扫二维码登录，否则可能会被微信封号。

我的大号已经被警告了...