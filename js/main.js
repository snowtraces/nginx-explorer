{

  let host = location.host;
  let base_path = `//${host}/CODE/`;

  /**
   * dom选择
   */
  const el = (selector) => document.querySelector(selector)
  const elAll = (selector) => document.querySelectorAll(selector)

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

  const getFileNodes = function (nodeName, nodeType) {
    get(base_path + nodeName).then(data => {
      let reg_base = new RegExp("<pre>([^`]*)</pre>", "g");
      let match_base = data.match(reg_base);
      if (!match_base) {
        return []
      }
      let array_base = match_base[0].split("\n");

      let next_nodes = array_base.map(element => element.replace(/^.*\"(.*)\"[^`]*$/, "$1"))
        .filter(href => href != "../" && href != "admin/" && href != "</pre>")
        .map(href => nodeName + href);

      buildPage(next_nodes || [])
      nav.setAttribute('path', nodeName)
    })
  }

  const buildPage = function (array_content) {
    let content = "<ul>";
    array_content.forEach(element => {
      let element_short = element.replace(/(.*\/)??([^/]+)\/?$/, "$2");
      if (element.endsWith(".jpg") || element.endsWith(".jpeg")) {
        content = content + "<li class='li-img'><img src='../" + element + "' title='" + element_short + "'></li>"
      } else {
        content = content + "<li><a href='" + element + "'>" + element_short + "</a></li>"
      }
    });
    content = content + "</ul>"

    main.innerHTML = content;
  }

  bindEvent('a', 'click', function (e) {
    e.preventDefault();
    getFileNodes(this.getAttribute('href'));
  })

  bindEvent('#nav', 'click', function (e) {
    e.preventDefault();
    let currPath = this.getAttribute('path');
    let prePath = currPath.replace(/^(.*\/)??([^/]+)\/?$/, '$1');

    getFileNodes(prePath);
  })

  bindEvent('.li-img img', "click", function (e) {
    let width = document.body.clientWidth * 0.8;
    let height = window.screen.height;

    el('#show img').src = this.getAttribute('src')
    el('#show').classList.add('show')
    el('#show').classList.remove('hide')
  })

  bindEvent('#show', 'click', () => {
    el('#show').classList.add('hide')
    el('#show').classList.remove('show')
  })


  window.onerror = handleError
  function handleError(msg, url, l) {
    var txt = "There was an error on this page.\n\n"
    txt += "Error: " + msg + "\n"
    txt += "URL: " + url + "\n"
    txt += "Line: " + l + "\n\n"
    txt += "Click OK to continue.\n\n"
    alert(txt)
    return true
  }

  getFileNodes("");
}