var arguments = process.argv[process.argv.length - 1];
var cheerio = require('cheerio');
var async = require('async');
var superagent = require('superagent');
var fecthData = {};
var fs = require('fs');
var count = 0;




// 指定型号的url,后续id可以变动
var url = `https://www.autozi.com/goods/detail/${arguments}.html`;
// 设置cookie 和ua
var cookie = 'JSESSIONID=91E6C087B7BF10BDC74F828DB478BA69; SPRING_SECURITY_REMEMBER_ME_COOKIE=T0NFQU55YzIwMTY6MTUxMTQzMjQzNjM4NjpjYmQ2Yzg0Mjg0MzljNDMyNWNkZjM4ZTZlZTRjZDQwZQ; mallCustomer=autozi; goodsScope=1; MallName=%E4%B8%AD%E9%A9%B0%E8%BD%A6%E7%A6%8F; areaStoreId=1603311432390038; thiscart=""; askpricecart=""; loginname=OCEANyc2016; NTKF_T2D_CLIENTID=guestAE396973-FD78-B91E-ABE0-E851C40D54EF; nTalk_CACHE_DATA={uid:kf_9588_ISME9754_OCEANyc2016,tid:1511431193610883}; Hm_lvt_039d115effb1a43fa3c66e592c74aa5e=1511348022; Hm_lpvt_039d115effb1a43fa3c66e592c74aa5e=1511431226; b2c_goods_browse_history_key=1411201748550249';
var UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36';
/**
 * 睡眠模拟函数
 * @param {Number} numberMillis 毫秒
 */

function sleep(numberMillis) {
  var now = new Date();
  var exitTime = now.getTime() + numberMillis;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime) {
      return;
    }
  }
}

/**
 * 启动函数
 * @param {String} url 配件详情的地址
 */
function fecthPartsBrand(url) {
  fecthBaseInfo(url, fecthBrandData)
}

/**
 * 获取基本信息
 * @param {String} url 配件详情的地址
 * @param {Function} callBack  回调
 */
function fecthBaseInfo(url, callBack) {
  superagent.get(url)
    .end((err, sres) => {
      if (err) {
        return console.error(err);
      }
      var $ = cheerio.load(sres.text);
      fecthData.name = $('body > div.detail-bg > div > div.pro-detail.fix > div.pro-detail-info > h2').text().trim();
      var goodsId = $("#hidden_goodsId").val()

      fecthData.goodsId = goodsId;
      fecthData.base = [];
      $('.pro-base-info.fix ul li').each((index, item) => {
        var $item = $(item);
        fecthData.base.push($item.text());
      });
      sleep(500);
      callBack && callBack(goodsId, fecthDetailData);
    })
}
/**
 * 获取配件下支持的品牌和车型数据
 * @param {*} goodsId 配件的id
 */
function fecthBrandData(goodsId, callBack) {
  var brandUrl = 'https://www.autozi.com/goods/carModels.do?goodsId=';
  var brandData = [];
  superagent.get(brandUrl + goodsId)
    .end((err, res) => {
      if (err) {
        return console.error(err);
      }
      var $ = cheerio.load(res.text);
      fecthData.brandData = {};
      console.log($('.suitable-type-item').length);
      if ($('.suitable-type-item').length == 0) {
        var t = JSON.stringify(fecthData);
        fs.writeFileSync(`${fecthData.name}.json`, t);
        return console.log('该配件没有适用车型');
      }
      $('.suitable-type-item').each((index, item) => {
        var $item = $(item);
        var brandName = $item.find('h4').text();
        fecthData.brandData[brandName] = {};
        var DataItem = {
          name: brandName,
          list: []
        }
        $item.find('p a').each((idex, el) => {
          $el = $(el);
          $el.text()
          DataItem.list.push({
            name: $el.text(),
            id: $el.attr('s_id')
          })
        })
        brandData.push(DataItem);
      });
      sleep(500);
      callBack && callBack(brandData);
    })
}

/**
 * 获取详细的车型数据
 */
function fecthDetailData(data) {
  // console.log(fecthData);
  for (var i = 0; i < data.length; i++) {
    var list = data[i].list;
    list.forEach(itemEl => {
      itemEl.bname = data[i].name;
    });
    var lists = list;
    async.mapLimit(lists, 1, function (item, callBack) {
      fecthBranUrl(item, callBack);
    }, function (err, result) {
      if (err) {
        console.log('err' + err);
        return;
      }
      var t = JSON.stringify(fecthData);
      fs.writeFileSync(`${fecthData.name}.json`, t);
    })
  }

  function fecthBranUrl(item, callBack) {
    var url = `https://www.autozi.com/goods/carModels.do?seriesId=${item.id}&goodsId=${fecthData.goodsId}`;
    superagent.get(url)
      .set('Cookie', cookie)
      .set('User-Agent', UserAgent)
      .set('Upgrade-Insecure-Requests', 1)
      .end((err, res) => {
        if (err) {
          return console.log(err);
        }
        var $ = cheerio.load(res.text);
        var arr = fecthData.brandData[item.bname][item.name] = []
        $('#carmodelsContainer li').each((index, el) => {
          $el = $(el);
          arr.push($el.text());
        });
        count++;
        callBack(null, fecthData)
      })
  }
}

fecthPartsBrand(url);