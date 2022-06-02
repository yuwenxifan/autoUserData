'ui';
ui.layout(
  <frame>
    <appbar h="auto">
      <toolbar id="toolbar" textSize="24sp" title="♬(ノ゜∇゜)ノ♩" />
    </appbar>
    <scroll marginTop="56">
      <vertical h="*">
        <vertical padding="16" h="*">
          <vertical>
            <text textSize="16sp" text="厨师最大编号数"/>
            <input id="maxChefId" inputType="number" text=""/>
          </vertical>
          <vertical>
            <text textSize="16sp" text="菜谱最大编号数"/>
            <input id="maxRepId" inputType="number" text=""/>
          </vertical>
          <button id="startButton" marginTop="20">开始运行</button>
          <text marginTop="20" text="脚本运行无需root，需要打开无障碍服务和软件悬浮窗权限，点击开始运行，左上角出现悬浮按钮[开始]，切换到游戏图鉴页面后，点击[开始]，然后放着等执行即可。"/>
          <text marginTop="12" text="正常执行会分别进入名厨录、名菜录并翻页翻到底，耗时大约2分半，执行成功会弹窗提示。"/>
          <text marginTop="12" text="数据文件地址：/sdcard/AutoUserData（/sdcard 指手机文件管理的根目录），其中 bcjhData.txt 是白菜菊花数据，foodgameData.txt 是L版图鉴数据。"/>
          <text marginTop="12" text="数据生成完成后打开白菜菊花/L图鉴，在个人页找到个人数据备份（文件版），将生成的数据导入即可。"/>
          <text marginTop="12" text="注意：" textSize="18sp"/>
          <text marginTop="12" textSize="16sp" text="本APP能自动生成爆炒江湖两个图鉴网的厨师已有、菜谱已有和品级数据；修炼和专精数据还是需要手动维护，本APP生成的数据文件导入时不会覆盖手动维护的修炼和专精数据"/>
          <text marginTop="12" textSize="16sp" text="运行前请确认厨师和菜谱的最大编号数据正确（正常不用改，游戏有更新我会更新后台数据）"/>
          <text marginTop="12" textSize="16sp" text="使用时最好关闭[夜间模式]和[护眼模式]"/>
          <text marginTop="12" textSize="16sp" text="因为获得新菜谱时的[新]与[神]级颜色太接近，防止品阶数据出错，使用前需要点一下菜谱图鉴然后退出，把新菜的标记清掉"/>
          <text marginTop="12" text="其他：" textSize="18sp"/>
          <text marginTop="12" text="log文件地址：/sdcard/AutoUserData/log.txt；点击右上角菜单可清除log缓存。"/>
          <text marginTop="12" text="代码 github 地址：https://github.com/yuwenxifan/autoUserData"/>
          <text marginTop="12" text=""/>
        </vertical>
      </vertical>
    </scroll>
  </frame>
);
var w = floaty.rawWindow(
  <frame id="floaty" visibility="gone">
    <button id="start" width="80" text="开始" visibility="visible"/>
    <button id="end" width="80" text="停止" visibility="gone"/>
  </frame>
);

// api地址
const api = {
  bcjh: 'https://bcjh.xyz/api/',
};

// 详情页区域坐标
let detailRegion = {};

// 默认配置
let config = { maxChefId: 1272, maxRepId: 671, comboCnt: 14 };
// 厨师菜谱编号
let chefId = 0;
let repId = 0;
// 白菜菊花数据
let bcjhData = { chefGot: {}, repGot: {} };
// L图鉴数据
let foodgameData = { recipes: [], chefs: []};
// 品级颜色配置
const rankColor = [
  { rank: '传', color: '#943284' },
  { rank: '神', color: '#d65929' },
  { rank: '特', color: '#de8912' },
  { rank: '优', color: '#a6c216' }
];

const dw = device.width;
const dh = device.height;

// 查找图片找不到的替代颜色配置
const colorCfg = {
  chef: {
    color: '#f5ab16', // 颜色值
    loc: { x: Math.floor(0.0426 * dw), y: Math.floor(dh * 0.0075) }, // 颜色在图片中的位置
  },
  rep: {
    color: '#f5ab16',
    loc: { x: Math.floor(0.0426 * dw), y: Math.floor(dh * 0.0054) }
  },
  pageDown: {
    color: '#f7c60b',
    loc: { x: Math.floor(0.035 * dw), y: Math.floor(dh * 0.0075) }
  },
  back: {
    color: '#a8460f',
    loc: { x: Math.floor(0.047 * dw), y: Math.floor(dh * 0.01) }
  },
  topLeft: {
    color: '#4c2b32',
    loc: { x: Math.floor(0.02 * dw), y: Math.floor(dh * 0) }
  },
  bottomLeft: {
    color: '#613c45',
    loc: { x: Math.floor(0.013 * dw), y: Math.floor(dh * 0.03) }
  }
};

// 初始化日志目录
console.setGlobalLogConfig({
  "file": "/sdcard/AutoUserData/log.txt"
});

// 初始化右上角的菜单
ui.emitter.on('create_options_menu', menu => {
  menu.add('清除日志缓存');
});

ui.emitter.on('options_item_selected', (e, item)=>{
  switch(item.getTitle()){
      case '清除日志缓存':
          reset_log();
          break;
  }
  e.consumed = true;
});
activity.setSupportActionBar(ui.toolbar);

try { // 调用接口获取配置
  let res = http.get(api.bcjh + 'get_auto_config');
  let resBody = JSON.parse(res.body.string());
  config = resBody;
} catch (e) {
  log('调用配置获取接口失败', e);
}
ui.maxChefId.setText(String(config.maxChefId));
ui.maxRepId.setText(String(config.maxRepId));

// 开启就检测无障碍状态
if (auto.service == null) {
  alert('请先开启“个人数据生成器”的无障碍服务');
  app.startActivity({
    action: 'android.settings.ACCESSIBILITY_SETTINGS',
  });
}

// 打开游戏
function openGame() {
  if (!$floaty.checkPermission()) {
    // 没有悬浮窗权限，提示用户并跳转请求
    toast('本脚本需要悬浮窗权限来显示悬浮窗，请在随后的界面中允许并重新运行本脚本。');
    $floaty.requestPermission();
    exit();
  } else {
    log('已有悬浮窗权限');
    // launch('com.taolu.foodgame'); // 打开游戏
  }
  w.floaty.attr("visibility", 'visible');
  w.setPosition(100, 100);
  w.start.on('click', startActivitys);
  w.end.on('click', end);
}

/**
 * @description 开始执行事件
 * @returns {boolean} 是否执行成功
 */
function startActivitys() {
  log('开始');
  toast('开始');
  w.start.attr("visibility", 'gone');
  w.end.attr("visibility", 'visible');
  // 请求截图权限
  var setScreenThread = threads.start(function () {
    if (!requestScreenCapture()) {
      log('请求截图失败');
      exit();
    }
  });

  config.maxChefId = Number(ui.maxChefId.getText());
  config.maxRepId = Number(ui.maxRepId.getText());

  threads.start(function () {
    // 开启子线程
    log('设备分辨率')
    log(dw, dh);
    // 等待请求截图权限
    setScreenThread.join();
    sleep(1000);

    // 进入名厨录
    let chef;
    while (!chef) {
      chef = findByImg('名厨录', transRegion(0.2, 0.12, 0.25, 0.29), 'chef');
    }
    // click(chef.x - 200, chef.y + 50); // 名厨录左边一大片都能点
    clickFind(chef);

    getDetailRegion(); // 查找详情区域

    let pagedown = findByImg('翻页箭头', transRegion(0.83, 0.7, 0.17, 0.25), 'pageDown');

    for (let i = 1; i <= Math.ceil(config.maxChefId / 12); i++) { // 设置数据，循环翻页
      setChef();
      clickFind(pagedown);
    }

    // 返回图鉴页，优先找退出按钮，兼容九游使用物理退出键无效的问题
    let back = findByImg('退出按钮', transRegion(0.83, 0.1, 0.17, 0.1), 'back');
    if (back) {
      clickFind(back)
    } else {
      back();
    }

    // 进入名菜录
    let rep;
    while (!rep) {
      rep = findByImg('名菜录', transRegion(0.45, 0.12, 0.28, 0.3), 'rep');
    }
    clickFind(rep);
    sleep(100);

    for (let i = 1; i <= Math.ceil(config.maxRepId / 12); i++) { // 设置数据，循环翻页
      setRep();
      clickFind(pagedown);
    }
    sleep(500)

    // 重设后厨菜谱的id
    for (let i = 0; i < config.comboCnt; i++) {
      key = 5000 + config.comboCnt - i; // 从后往前
      bcjhData.repGot[key] = bcjhData.repGot[config.maxRepId - i];
      delete bcjhData.repGot[config.maxRepId - i]; // 删除原编号的数据

      foodgameData.recipes[config.maxRepId - i - 1].id = key;
    }

    // 保存数据
    files.write("/sdcard/AutoUserData/bcjhData.txt", JSON.stringify(bcjhData));
    files.write("/sdcard/AutoUserData/foodgameData.txt", JSON.stringify(foodgameData));
    sleep(1000);
    alert('执行成功！生成的数据在/sdcard(手机文件管理根目录)/AutoUserData下，现在可以打开白菜菊花/L图鉴将数据导入了(*ﾟ∀ﾟ*)');
    exit();
  });
}

// （测试用方法）保存查找区域的图片在手机上，便于判断问题
function saveLogImages(screen, r, name) {
  let clip = images.clip(screen, r[0], r[1], r[2], r[3]);
  files.create('/sdcard/AutoUserData/logImages/');
  images.save(clip, '/sdcard/AutoUserData/logImages/' + name + '查找区域.png');
  clip.recycle();
}

// 设置厨师数据
function setChef() {
  sleep(500);
  let deviceScreen = images.captureScreen();
  let gray = images.grayscale(deviceScreen); // 灰度化图片
  let bin = images.inRange(gray, "#505050", "#ffffff") // 将图片二值化，把比背景颜色深的置为黑，其余为白
  for (let y = 1; y <= 4; y++) { // 4行
    chefId += 3;
    if (chefId > config.maxChefId) break; // 如果编号超过最大值，跳出循环
    let r = detailRegion[y + '-1']; // 判断一阶厨师
    let clip = images.clip(bin, r.x, r.y, r.w, r.h); // 截取图片
    let p = findColor(clip, "#ffffff"); // 有白色就说明拥有厨师
    bcjhData.chefGot[chefId] = Boolean(p);
    foodgameData.chefs.push({
      id: chefId,
      got: p ? '是' : ''
    });
    clip.recycle();
  }
  bin.recycle();
  gray.recycle();
}

// 设置菜谱数据
function setRep() {
  sleep(500);
  let deviceScreen = images.captureScreen();
  let gray = images.grayscale(deviceScreen); // 灰度化图片
  let bin = images.inRange(gray, "#505050", "#ffffff") // 将图片二值化，把比背景颜色深的置为黑，其余为白
  for (let y = 1; y <= 4; y++) { // 4行
    for (let x = 1; x <= 3; x++) { // 3列
      repId += 1;
      if (repId > config.maxRepId) break; // 如果编号超过最大值，跳出循环
      let r = detailRegion[y + '-' + x];
      let clip = images.clip(bin, r.x, r.y, r.w, r.h); // 截取图片
      let p = findColor(clip, "#ffffff"); // 有白色就说明拥有厨师
      bcjhData.repGot[repId] = Boolean(p);
      let rep = {
        id: repId,
        got: p ? '是' : '',
        rank: ''
      };
      clip.recycle();


      if (p) { // 已有的情况下
        let rank = images.clip(deviceScreen, (r.x + 1.3 * r.w), r.y - r.h, r.w * 0.7, r.h * 0.7); // 截取图片
        for (let rc of rankColor) { // 循环匹配等级
          let c = findColor(rank, rc.color);
          if (c) {
            rep.rank = rc.rank;
            break;
          }
        }
        rank.recycle();
      }
      foodgameData.recipes.push(rep);
    }
  }
  bin.recycle();
  gray.recycle();
}

// 获取详情区域位置
function getDetailRegion() {
  let r = {};
  let topLeft = findByImg('详情左上角', transRegion(0, 0.12, 0.3, 0.2), 'topLeft')
  let bottomLeft = findByImg('详情左下角', transRegion(0, 0.7, 0.3, 0.2), 'bottomLeft')
  // 全局详情区域
  r.left = Math.floor(topLeft.x);
  r.top = Math.floor(topLeft.y);
  r.right = Math.floor(dw - r.left);
  r.bottom = Math.floor(bottomLeft.y + 0.03 * dh);
  r.width = Math.floor(r.right - r.left);
  r.height = Math.floor(r.bottom - r.top);
  for (let y = 1; y <= 4; y++) { // 4行
    for (let x = 1; x <= 3; x++) { // 3列
      let key = y + '-' + x;
      // 每一小块的区域
      let p = {
        w: r.width / 3,
        h: r.height / 4,
      };
      p.x = Math.floor(r.left + (x - 1) * p.w);
      p.y = Math.floor(r.top + (y - 1) * p.h);
      // 取每小块最中间的位置
      p.x += Math.floor(p.w / 3);
      p.y += Math.floor(p.h / 3);
      p.w = Math.floor(p.w / 3);
      p.h = Math.floor(p.h / 3);
      r[key] = p;
    }
  }
  // let deviceScreen = images.captureScreen();
  // let clip = images.clip(deviceScreen, r.left, r.top, r.width, r.height);
  // files.create('/sdcard/AutoUserData/logImages/');
  // images.save(clip, '/sdcard/AutoUserData/logImages/详情区域.png');
  // clip.recycle();
  log('详情区域坐标:');
  log(r);
  detailRegion = r;
}

/**
 * 按图片查找
 * @param {string} img_name 图片名称
 * @param {Array} [region] 查找区域
 * @param {string} [colorKey] 图片找不到的时候，查找颜色的配置key
 */
function findByImg(img_name, region, colorKey) {
  sleep(500);
  const logText = {
    find: '找到了' + img_name,
    unfind: '没找到' + img_name,
  };
  let deviceScreen = images.captureScreen();
  let clickImg = images.read('./img/' + img_name + '.png');
  let cfg = { threshold: 0.8 };

  if (region) {
    cfg.region = region;
    // saveLogImages(deviceScreen, region, img_name);
  }
  let p = images.findImage(deviceScreen, clickImg, cfg);
  clickImg.recycle();

  if (!p && colorKey) { // 如果有备选颜色识别
    log('没找到' + img_name + '图片，改用颜色识别');
    let pColor;
    let { color, loc } = colorCfg[colorKey];
    if (colorKey == 'bottomLeft') { // 左下角坐标特殊逻辑，找最左，最下的颜色点
      const arr = images.findAllPointsForColor(deviceScreen, color, { region });
      arr.forEach(item => {
        if (!pColor) {
          pColor = item;
        } else {
          if (!pColor.x || pColor.x > item.x) pColor.x = item.x; // 找到最左的x值
          if (!pColor.y || pColor.y < item.y) pColor.y = item.y; // 找到最下的y值
        }
      });
    } else {
      pColor = images.findColor(deviceScreen, color, { region });
    }
    // 减掉颜色值在图片中的坐标，使该函数返回的坐标点击不会出错
    pColor.x -= loc.x;
    pColor.y -= loc.y;
    p = pColor;
  }

  if (p) {
    log(logText.find);
    log(img_name + '查找坐标：', p);
  } else {
    log(logText.unfind);
    toast(logText.unfind)
  }
  sleep(100);
  return p;
}

// 将百分比格式的region翻译为坐标
function transRegion(x, y, w, h) {
  x = Math.floor(dw * x);
  w = Math.floor(dw * w);
  y = Math.floor(dh * y);
  h = Math.floor(dh * h);
  return [x, y, w, h];
}

function clickFind(p) { // 点击找到的图片
  click(p.x + 0.05 * dw, p.y + 0.02 * dh);
}


function end() {
  toast('结束运行');
  exit();
}

/**
 * @description 清除日志缓存
 */
function reset_log() {
  files.remove('/sdcard/AutoUserData/log.txt');
  files.createWithDirs('/sdcard/AutoUserData/log.txt');
  // files.removeDir('/sdcard/AutoUserData/logImages');
  // files.create('/sdcard/AutoUserData/logImages/');
  console.setGlobalLogConfig({
      "file": "/sdcard/AutoUserData/log.txt"
  });
  toast('缓存清除完毕');
}

ui.startButton.on('click', openGame);
