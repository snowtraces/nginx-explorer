{

  /**
   * 全局异常处理
   * @param {*} msg
   * @param {*} url
   * @param {*} l
   */
  window.onerror = function (msg, url, l) {
    var txt = "There was an error on this page.\n\n"
    txt += "Error: " + msg + "\n"
    txt += "URL: " + url + "\n"
    txt += "Line: " + l + "\n\n"
    txt += "Click OK to continue.\n\n"
    alert(txt)
    return true
  }

  /**
   * 缓存
   */
  const cache = {
    get(key) {
      return localStorage.getItem(key)
    },
    set(key, value) {
      localStorage.setItem(key, value)
    }
  }

  let host = location.host;
  window.g_base_path = window.g_base_path || cache.get('g_base_path') || location.pathname.replace(/^(\/[^\/]+\/).*/, "$1");
  cache.set('g_base_path', window.g_base_path)
  window.g_full_path = `//${host}${window.g_base_path}`

  /**
   * dom选择
   */
  const el = (selector) => document.querySelector(selector)
  const elAll = (selector) => document.querySelectorAll(selector)


  const eventTarget = function (e) {
    if (!e) {
      return null
    }
    return (e.path || (e.composedPath && e.composedPath()))[0]
  }


  /**
   * 事件绑定
   */
  const bindEvent = (selector, event, func) => {
    const nodeList = elAll(selector)
    if (!nodeList || nodeList.length === 0) {
      bindEventForce(selector, event, func)
    } else {
      let eventList = event.split(' ').map(e => e.trim())
      nodeList.forEach(
        node => eventList.forEach(e => node.addEventListener(e, func, false))
      )
    }
  }

  /**
   * 事件绑定委托，默认使用document处理event
   */
  const bindEventForce = function (selector, event, func, delegation) {
    let eventList = event.split(' ').map(e => e.trim())
    eventList.forEach(e => {
      (delegation ? el(delegation) : document).addEventListener(e, (_e) => {
        const _list = elAll(selector)
        _list.forEach(
          item => (_e.target === item || item.contains(_e.target)) && func.call(item, _e)
        )
      }, false)
    })
  }

  /**
   * get 请求
   * @param {*} url 
   * @param {*} data 
   */
  const get = function (url, data) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      if (data) {
        url = url + '?' + Object.keys(data).map(key => `${key}=${data[key]}`).join('&')
      }
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status >= 200 && xhr.status < 400) {
            resolve(xhr.responseText);
          } else {
            reject ? reject() : console.error(`请求异常：${url}`)
          }
        }
      }
      xhr.send(null);
    })
  }

  const sizeBeauty = function (sizeNumber) {
    let sizeUnits = ['B', 'K', 'M', 'G']
    let _size = sizeNumber
    let i = 0
    while ((sizeNumber = sizeNumber / 1000) > 1) {
      i++
    }
    return (_size / (1000 ** i)).toFixed(0) + sizeUnits[i]
  }

  /**
   * 根据文件名判断是否为文本文件
   * @param {*} fileName 
   */
  const checkIsTextFile = function (fileName) {
    if (fileName.lastIndexOf('.') === -1) {
      return true;
    }
    let plainTextFileExtends = [
      'txt', 'html', 'htm', 'sh', 'py', 'java', 'c', 'cpp', 'bat', 'ps1',
      'log', 'sql', 'xml', 'js', 'iml', 'md', 'json', 'csv', 'vb', 'pl',
      'css', 'vue', 'swift', 'ts'
    ];
    let subfix = fileName.substr(fileName.lastIndexOf('.') + 1);
    return plainTextFileExtends.includes(subfix.toLowerCase())
  }

  /**
   * 获取列表
   * @param {*} nodeName 
   * @param {*} scrollQueue 滚动位置队列 父父级|父级|当前 
   */
  const getFileNodes = function (nodeName, scrollQueue, fileSize) {
    if ((fileSize && fileSize !== '0') && !checkIsTextFile(nodeName.substr(nodeName.lastIndexOf('/') + 1))) {
      return;
    }

    get(g_full_path + nodeName).then(data => {
      let reg_base = new RegExp("<pre>([^`]*)</pre>", "g");
      let match_base = data.match(reg_base);
      if (!data.includes("<h1>Index of") || !match_base) {
        if (fileSize > 5_000_000) {
          return;
        }
        // 直接展示内容
        el('#show-raw > textarea').value = data
        el('#show-raw').classList.remove('hide')
        el('#show-raw').classList.add('show')
        return;
      }

      let array_base = match_base[0].split("\n");

      let sizeUnits = ['K', 'M', 'G']
      let next_nodes = array_base
        .map(element => {
          let path = element.replace(/^.*\"(.*)\"[^`]*$/, "$1")
          let size = element.replace(/^.* ([^\b-]+) ?$/, "$1").trim()
          let sizeNumber = 0
          if (/^[0-9]+$/.test(size)) {
            sizeNumber = size
          } else {
            sizeUnits.forEach((unit, idx) => {
              if (size.endsWith(unit)) {
                sizeNumber = size.substr(0, size.length - 1) * (1000 ** (idx + 1))
              }
            })
          }

          return { path: path, size: sizeNumber }
        })
        .filter(node => node.path != "../" && node.path != "admin/" && node.path != "</pre>")
        .map(node => {
          node.path = nodeName + node.path;
          return node;
        });

      // 获取滚动位置
      let to_scrollY = 0;
      let from_scrollY = 0;
      let scrollArray = [];
      if (scrollQueue) {
        scrollArray = scrollQueue.split('|');
        to_scrollY = scrollArray.pop();
        from_scrollY = scrollArray.join('|');
      }

      buildPage(next_nodes || [], to_scrollY)
      let nodeArray = nodeName.split('/');
      el('.nav-detail').innerHTML = '/ ' +
        nodeArray
          .filter(node => node)
          .map((node, idx) =>
            `<span 
              data-path='${nodeArray.slice(0, idx + 1).join('/')}/' 
              data-scrollY='${scrollArray.slice(0, idx + 3).join('|')}' 
              class='nav-seg'>${node}</span>`).join(' / ');
      nav.setAttribute('path', nodeName)
      nav.setAttribute('scrollY', from_scrollY)
    })
  }

  const initImg = function () {
    elAll('li > img').forEach(img => {
      if (img.offsetTop < window.scrollY + window.outerHeight) {
        let src = img.getAttribute('raw-src')
        img.setAttribute('src', src)
      }
    })
  }

  /**
   * 加载页面
   * @param {*} array_content 
   * @param {*} to_scrollY 
   */
  const buildPage = function (array_content, to_scrollY) {
    let contentList = []
    array_content.forEach(node => {
      let path = node.path;
      let path_short = path.replace(/(.*\/)??([^/]+)\/?$/, "$2");
      if (/\.(jpe?g|png)$/.test(path)) {
        contentList.push(`<li class='li-img'><img raw-src='${g_full_path + path}' title='${path_short}' ></li>`);
      } else if (/\.mp4$/.test(path)) {
        contentList.push(`<li class='li-img'><video controls src='${g_full_path + path}' title='${path_short}' ></li>`);
      } else {
        if (node.size) {
          contentList.push(`<li><a class='with-size' href='${path}' data-size=${node.size}>${decodeURI(path_short)}<span>[${sizeBeauty(node.size)}]</span></a></li>`);
        } else {
          contentList.push(`<li><a href='${path}' data-size=${node.size}>${decodeURI(path_short)}</a></li>`);
        }
      }
    });

    main.innerHTML = `<ul class=clearfix>${contentList.join('\n')}</ul>`;
    initImg();

    setTimeout(() => {
      window.scroll(0, to_scrollY || 0)
    }, 0);
  }

  /**
   * 事件监听
   */
  const eventHandler = () => {
    /**
     * 点击浏览下一级
     */
    bindEvent('a', 'click', function (e) {
      e.preventDefault();
      let from_scrollY = nav.getAttribute('scrollY');
      getFileNodes(this.getAttribute('href'), `${from_scrollY}|${window.scrollY.toFixed(0)}|0`, eventTarget(e).dataset.size);
    })

    /**
     * 点击返回
     */
    bindEvent('#nav', 'click', function (e) {
      e.preventDefault();
      let currPath = this.getAttribute('path');
      let scrollY = this.getAttribute('scrollY');
      let prePath = currPath.replace(/^(.*\/)??([^/]+)\/?$/, '$1');

      getFileNodes(prePath, scrollY);
    })

    /**
     * 点击设置
     */
    bindEvent('#show-btn', 'click', function (e) {
      let isShow = el('[name="base-path"]').classList.contains('show');
      if (isShow) {
        el('[name="base-path"]').classList.remove('show');
        el('[name="base-path"]').classList.add('hide');
        el('#show-btn').classList.remove('on-active');

        let base_path = el('[name="base-path"]').value
        if (base_path) {
          if (!base_path.endsWith("/")) {
            base_path += "/"
          }
          window.g_base_path = base_path;
          cache.set('g_base_path', base_path)
          window.g_full_path = `//${host}${window.g_base_path}`
          getFileNodes("");
        }
      } else {
        el('[name="base-path"]').classList.remove('hide');
        el('[name="base-path"]').classList.add('show');
        el('#show-btn').classList.add('on-active');
        el('[name="base-path"]').value = window.g_base_path
      }
    })

    /**
     * 图片最大化
     */
    bindEvent('.li-img img', "click", function (e) {
      el('#show-img img').src = this.getAttribute('src')
      el('#show-img').classList.add('show')
      el('#show-img').classList.remove('hide')
    })

    bindEvent('#show-img', 'click', () => {
      el('#show-img').classList.add('hide')
      el('#show-img').classList.remove('show')
    })

    /**
     * 数据模态框展示
     */
    bindEvent('#show-raw', 'click', function (e) {
      if (eventTarget(e).tagName.toUpperCase() !== 'TEXTAREA') {
        el('#show-raw > textarea').value = ''
        el('#show-raw').classList.add('hide')
        el('#show-raw').classList.remove('show')
      }
    })

    /**
     * 图片异步加载
     */
    window.addEventListener('scroll', function (e) {
      initImg();
    })

    /**
     * 导航栏点击跳转
     */
    bindEvent('.nav-seg', 'click', function (e) {
      let _this = eventTarget(e);
      let path = _this.dataset.path
      let currPath = nav.getAttribute('path')
      if (path === currPath) {
        return
      }

      let scrollY = _this.dataset.scrolly;
      getFileNodes(path, scrollY)
    })

  }

  eventHandler()
  
  getFileNodes("");
  var ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipod|ipad/i.test(navigator.appVersion) && /MicroMessenger/i.test(ua)) {
    document.body.addEventListener('focusout', () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    });
  }
}