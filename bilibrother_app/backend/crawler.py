"""
B站视频数据爬虫模块，基于原始的bilibrother.py重构
"""
import requests
import time
import json
import hashlib
import logging
from datetime import datetime
from threading import Lock
from concurrent.futures import ThreadPoolExecutor

# 配置日志系统
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bilibili_monitor.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 默认请求头，模拟浏览器访问
DEFAULT_HEADERS = {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    'Referer': 'https://www.bilibili.com/'  # Referer 用于告诉服务器请求来源
}

# 缓存 WBI 参数，避免频繁请求
_wbi_cache = {
    "params": None,
    "expiry": 0,
    "lock": Lock()
}

class BiliCrawler:
    """B站视频数据爬虫类"""
    
    def __init__(self, cookie=None):
        """初始化爬虫实例
        
        Args:
            cookie: B站登录Cookie
        """
        self.cookie = cookie
        self.headers = DEFAULT_HEADERS.copy()
        if cookie:
            self.headers['Cookie'] = cookie
    
    def set_cookie(self, cookie):
        """设置Cookie
        
        Args:
            cookie: B站登录Cookie
        """
        self.cookie = cookie
        self.headers['Cookie'] = cookie

    def get_wbi_params(self):
        """获取B站WBI签名所需参数
        
        Returns:
            包含img_key、sub_key和时间戳的字典，失败返回None
        """
        # 检查缓存是否有效
        current_time = time.time()
        with _wbi_cache["lock"]:
            if _wbi_cache["params"] and current_time < _wbi_cache["expiry"]:
                return _wbi_cache["params"]
            
            url = 'https://api.bilibili.com/x/web-interface/nav'
            
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                data = response.json()
                if data['code'] != 0:
                    logger.error(f"获取WBI参数失败: code={data['code']}, message={data.get('message', '未知错误')}")
                    return None

                wbi_img = data['data']['wbi_img']
                img_key = wbi_img['img_url'].split('/')[-1].split('.')[0]
                sub_key = wbi_img['sub_url'].split('/')[-1].split('.')[0]
                logger.info(f"成功获取WBI参数: img_key={img_key}, sub_key={sub_key}")
                
                # 缓存参数，有效期30分钟
                params = {'img_key': img_key, 'sub_key': sub_key, 'wts': int(current_time)}
                _wbi_cache["params"] = params
                _wbi_cache["expiry"] = current_time + 1800  # 30分钟
                
                return params
            except Exception as e:
                logger.error(f"获取WBI参数出错: {str(e)}")
                return None

    def generate_w_rid(self, params, img_key, sub_key):
        """生成WBI签名(w_rid)
        
        根据参数和密钥生成B站API所需的w_rid签名
        
        Args:
            params: 请求参数字典
            img_key: WBI图片密钥
            sub_key: WBI子密钥
            
        Returns:
            生成的w_rid签名字符串
        """
        # B站官方的混淆密钥表
        mixin_key_enc_tab = [
            46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
            33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
            61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
            36, 20, 34, 44, 52
        ]
        # 合并两个密钥
        combined_key = img_key + sub_key
        # 根据混淆表生成最终密钥
        mixin_key = ''.join(combined_key[i] for i in mixin_key_enc_tab)[:32]
        # 将参数按照字母顺序排序并拼接
        params_list = sorted([f"{k}={v}" for k, v in params.items()])
        params_str = '&'.join(params_list)
        # 生成最终的w_rid签名
        w_rid = hashlib.md5((params_str + mixin_key).encode('utf-8')).hexdigest()
        return w_rid

    def get_video_info(self, bvid):
        """获取视频详细信息
        
        使用wbi/view API获取视频的详细信息，包括标题、播放量、点赞数等
        
        Args:
            bvid: B站视频的BV号
            
        Returns:
            包含视频信息的字典，失败返回None
        """
        wbi_params = self.get_wbi_params()
        if not wbi_params or 'img_key' not in wbi_params or 'sub_key' not in wbi_params:
            logger.warning(f"{bvid} 跳过 - WBI参数不完整: {wbi_params}")
            return None

        url = 'https://api.bilibili.com/x/web-interface/wbi/view'
        params = {'bvid': bvid, 'wts': wbi_params['wts']}
        
        # 生成w_rid签名
        w_rid = self.generate_w_rid(params, wbi_params['img_key'], wbi_params['sub_key'])
        params['w_rid'] = w_rid

        try:
            # 添加延迟避免频繁请求被封IP
            time.sleep(1)  
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            data = response.json()
            
            if data['code'] != 0:
                logger.error(f"{bvid} API返回错误: code={data['code']}, message={data.get('message', '未知错误')}")
                return None

            if 'data' not in data:
                logger.error(f"{bvid} 响应缺少'data'字段: {json.dumps(data)}")
                return None

            return data['data']
        except Exception as e:
            logger.error(f"获取{bvid}详情时出错: {str(e)}")
            return None

    def get_user_info(self, mid):
        """获取UP主信息
        
        使用card API获取UP主的信息，包括粉丝数、历史点赞数、稿件数等
        
        Args:
            mid: UP主的用户ID
            
        Returns:
            包含UP主信息的字典，失败返回None
        """
        url = 'https://api.bilibili.com/x/web-interface/card'
        params = {'mid': mid}

        try:
            # 添加延迟避免频繁请求被封IP
            time.sleep(1)  
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            data = response.json()
            
            if data['code'] != 0:
                logger.error(f"用户{mid} API返回错误: code={data['code']}, message={data.get('message', '未知错误')}")
                return None

            if 'data' not in data:
                logger.error(f"用户{mid} 响应缺少'data'字段: {json.dumps(data)}")
                return None

            return data['data']
        except Exception as e:
            logger.error(f"获取用户{mid}信息时出错: {str(e)}")
            return None

    def process_video(self, bvid):
        """处理单个视频并返回数据
        
        获取视频和UP主的详细信息，整合成一条完整的数据记录
        
        Args:
            bvid: B站视频的BV号
            
        Returns:
            包含视频和UP主完整信息的字典，失败返回None
        """
        logger.info(f"正在处理视频: {bvid}")
        
        # 获取视频信息
        video_data = self.get_video_info(bvid)
        if not video_data:
            logger.error(f"获取视频数据失败: {bvid}")
            return None
        
        # 获取UP主信息
        mid = video_data.get('owner', {}).get('mid')
        if not mid:
            logger.error(f"未找到视频所属UP主ID: {bvid}")
            return None
        
        user_data = self.get_user_info(mid)
        if not user_data:
            logger.error(f"获取UP主数据失败: mid={mid}, bvid={bvid}")
            return None
        
        try:
            # 提取视频信息
            title = video_data.get('title', '未知标题')
            link = f"https://www.bilibili.com/video/{bvid}"
            view_count = video_data.get('stat', {}).get('view', 0)
            danmaku_count = video_data.get('stat', {}).get('danmaku', 0)
            coin_count = video_data.get('stat', {}).get('coin', 0)
            like_count = video_data.get('stat', {}).get('like', 0)
            share_count = video_data.get('stat', {}).get('share', 0)
            favorite_count = video_data.get('stat', {}).get('favorite', 0)
            tname = video_data.get('tname', '未知分区')
            cover_url = video_data.get('pic', '')
            duration = video_data.get('duration', 0)
            
            # 提取UP主信息
            card_data = user_data.get('card', {})
            follower_count = card_data.get('fans', 0)
            author_name = card_data.get('name', '未知UP主')
            
            # 从user_data获取点赞和稿件数
            historical_likes = user_data.get('like_num', 0)
            archive_count = user_data.get('archive_count', 0)
            
            result = {
                'bvid': bvid,
                'title': title,
                'link': link,
                'view_count': view_count,
                'danmaku_count': danmaku_count,
                'coin_count': coin_count,
                'like_count': like_count,
                'share_count': share_count,
                'favorite_count': favorite_count,
                'tname': tname,
                'cover_url': cover_url,
                'duration': duration,
                'follower_count': follower_count,
                'historical_likes': historical_likes,
                'archive_count': archive_count,
                'mid': mid,
                'author_name': author_name,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            logger.info(f"成功处理视频: {bvid}")
            return result
        except Exception as e:
            logger.error(f"处理视频{bvid}时出错: {str(e)}")
            return None

    def batch_process_videos(self, bv_list, max_workers=2):
        """批量处理多个视频
        
        Args:
            bv_list: BV号列表
            max_workers: 最大线程数
            
        Returns:
            处理结果列表
        """
        if not bv_list:
            logger.warning("未提供BV号列表")
            return []
            
        logger.info(f"正在批量处理 {len(bv_list)} 个视频")
        results = []
        
        # 使用线程池并发处理，提高效率
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self.process_video, bvid) for bvid in bv_list]
            for future in futures:
                result = future.result()
                if result:
                    results.append(result)
        
        logger.info(f"成功处理 {len(results)}/{len(bv_list)} 个视频")
        return results
