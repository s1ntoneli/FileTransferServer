# FileTransferServer
用来解决防盗链图片问题的中转服务器。

部署在 `LeanEngine`, 专为解决 Chrome 插件项目`KeepImageInBrowser` 中遇到的图片防盗链问题。

## 使用方法
<pre>
接口:

codeli.leancloud.cn:3000/image?url=xxx&srcUrl=xxx

参数:
url: 图片 url。必选。
srcUrl: 引用图片的 url，该 url 可保证绕过防盗链限制。非必选。
</pre>

## 原理
伪造请求的 `Referer` 字段。若有 `srcUrl` 参数，使用 `srcUrl`。 否则使用图片链接的 hostname。
