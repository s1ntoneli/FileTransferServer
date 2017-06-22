# FileTransferServer
用来解决防盗链图片问题的中转服务器。

部署在 `LeanEngine`, 专为解决 Chrome 插件项目`KeepImageInBrowser` 中遇到的图片防盗链问题。

## 使用方法
<pre>
接口:

codeli.leanapp.cn/image?url=xxx&srcUrl=xxx

参数:
url: 图片 url。必选。
srcUrl: 引用图片的 url，该 url 可保证绕过防盗链限制。非必选。
</pre>

## 原理
伪造请求的 `Referer` 字段。若有 `srcUrl` 参数，使用 `srcUrl`。 否则使用图片链接的 hostname。



===================================================================================




## 附文

### 服务器作防盗链图片中转，nodejs 上手项目简明记录


前几天随手写的 chrome 插件遇到了防盗链问题，由于插件不能用 js iframe 的方法反防盗链，于是想用服务器做个中转。


记录一下上手项目的各个点，以后再用 `nodejs` 就不用到处查资料了。

之前没有一套特别熟悉的 web 开发框架，加上插件存储服务依赖的平台 `LeanCloud` 刚好支持部署 `nodejs` 网站，刚好拿这个小项目作为 `nodejs` 上手项目。

---

**怎么"破解防盗链"呢？**
想要破解，就得先知道目标——防盗链如何实现。
大多数站点的策略很简单: 判断`request`请求头的`refer`是否来源于本站。若不是，拒绝访问真实图片。

而我们知道: 请求头是来自于客户端，是可伪造的。

**思路**
那么，我们伪造一个正确的refer来访问不就行了?
整个业务逻辑大概像这样:  
1. 自己的服务器后台接受带目标图片`url`参数的请求
2. 伪造`refer`请求目标图片
3. 把请求到的数据作为`response`返回

这就起到了图片中转的作用。



### 1. 项目是什么样子
#### 1.1 接口的样子?
- 有一个开放接口
- 接口有一个参数，`api?url=http://abc.com/image.png`，大概长这样子
- 响应内容是反防盗链后的真实图片

#### 1.2 应该怎么做?
- 把服务器跑起来
- 处理 GET 请求
- 分析请求参数
- 下载原图
- response 原图


### 2. 学习路径(在对目标未知的前提下提出疑问)

1.  如何开始，建立服务器
2.  如何处理基本请求 GET POST
3.  如何下载图片并转发
4.  完成基本功能，上线
5.  优化

#### 2.1 如何开始，建立服务器
主要是  `http.createServer().listen(port)` 这组方法，建立服务器、监听端口一键搞定。

```
var http = require('http');
	
http.createServer(function (request, response) {
	 // do things here
}).listen(8888);
	
console.log('Server running at: 8888');
```

#### 2.2 如何处理基本请求 GET POST
`createServer` 回调方法的两个参数 `req` `res` 是 http `request` 和 `response` 的内容，打印一下他们的内容。

`request` 是 `InComingMessage` 类，打印它的 `url` 字段。

```
var http = require('http');
var url = require('url');
var util = require('util');
http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end(util.inspect(url.parse(req.url, true)));
}).listen(3000);
```

**请求**
`http://localhost:3000/api?url=http://abc.com/image.png`

**请求结果**

```
Url {
  protocol: null,
  slashes: null,
  auth: null,
  host: null,
  port: null,
  hostname: null,
  hash: null,
  search: '?url=http://abc.com/image.png',
  query: { url: 'http://abc.com/image.png' },
  pathname: '/api',
  path: '/api?url=http://abc.com/image.png',
  href: '/api?url=http://abc.com/image.png' }
```

`query` 字段刚好是我们想要的内容，下载这个字段对应的图片。

#### 2.3 如何下载图片并转发
`request` 模块支持管道方法，可以和 `shell` 的管道一样理解。

这可以省很多事，不需要在本地存储图片，不需要处理杂七杂八的事情，甚至不需要再去了解 `nodejs` 的流。一个方法全搞定。

关键方法: `request(options).pipe(res)`

<pre>
	var options = {
	  uri: imgUrl, // 这个 uri 为空时，会认为该字段不存在，报异常
	  headers: {
	     'Referer': referrer // 解决部分防盗链选项
	  }
	};
	request(options).pipe(res);
</pre>

#### 2.4 完成基本功能，上线
[项目地址](https://github.com/auv1107/FileTransferServer/blob/master/routes/image.js)

**完整代码**

```
	'use strict';
	var router = require('express').Router();
	var http = require('http');
	var url = require('url');
	var util = require('util');
	var fs = require('fs');
	var callfile = require('child_process');
	var request = require('request');
	
	router.get('/', function(req, res, next) {
		var imgUrl = url.parse(req.url, true).query.url;
	    console.log(url.parse(req.url,true).query); 
	
	    console.log('get a request for ' + imgUrl);
	    if (imgUrl == null || imgUrl == "" || imgUrl == undefined) {
	    	console.log('end');
	    	res.end();
	    	return;
	    }
	
	    var parsedUrl = url.parse(imgUrl);
	    // 这里暂时使用图片服务器主机名做Referer
	    var referrer = parsedUrl.protocol + '//' + parsedUrl.host; 
	    console.log('referrer ' + referrer);
	
		var options = {
		  uri: imgUrl,
		  headers: {
		     'Referer': referrer
		  }
		};
	
		function callback(error, response, body) {
		  if (!error && response.statusCode == 200) {
		    console.log("type " + response.headers['content-type']);
		  }
		  res.end(response.body);
		}
	
		// request(options, callback);
		request(options)
			.on('error', function(err) {
			    console.log(err)
			})
			.pipe(res);
	});
	
	module.exports = router;
```

#### 2.5 优化
这部分主要是防盗链部分的优化。

单就 `Referer` 来说，使用空值和主机名都只能满足部分需求。

一个优化方式是组合，当一种方式不能突破即采用另一种方式。
这种方式的有点在于扩大了适用面积，并且方法对任何场景比较通用。

一个优化方式是接口请求参数带源引用连接。
这种方式对很多人来说不太通用，因为很多场景下并不清楚源引用连接在哪。
但是对我的插件来说非常适用，插件本身保留了源引用。因此可以很好的绕过防盗链限制。

