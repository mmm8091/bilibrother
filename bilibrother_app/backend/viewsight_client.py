"""
ViewSight_server 集成模块
处理与B站视频播放量预测模型的API交互
"""
import requests
import json
import logging
from datetime import datetime
from .models import Config, db
from flask import current_app

logger = logging.getLogger(__name__)

class ViewSightClient:
    """ViewSight API客户端，用于与视频预测服务器交互"""
    
    def __init__(self, config_dict=None):
        """初始化ViewSight客户端
        
        Args:
            config_dict: 配置字典，若不提供则从数据库加载
        """
        self.config = config_dict or self._load_config_from_db()
        self.server_url = self.config.get('viewsight_server_url', 'http://sy1.efrp.eu.org:40399')
        
    def _load_config_from_db(self):
        """从数据库加载配置"""
        config = {}
        try:
            # 获取所有配置项
            config_items = Config.query.all()
            for item in config_items:
                config[item.key] = item.value
                
            # 确保所需配置存在
            required_keys = [
                'bilibili_cookie', 
                'viewsight_server_url',
                'viewsight_image_url',
                'viewsight_image_token',
                'viewsight_image_model',
            ]
            
            # 记录缺失的配置项
            missing_keys = [key for key in required_keys if not config.get(key)]
            if missing_keys:
                logger.warning(f"缺少ViewSight配置项: {', '.join(missing_keys)}")
                
        except Exception as e:
            logger.error(f"加载配置失败: {str(e)}")
            config = {}
            
        return config
    
    def format_viewsight_config(self):
        """格式化ViewSight所需的配置对象"""
        # 获取B站cookie
        cookie = self.config.get('bilibili_cookie', '')
        
        # 如果cookie是SESSDATA和bili_jct的格式，需要转换一下
        if not cookie and 'SESSDATA' in self.config and 'bili_jct' in self.config:
            sessdata = self.config.get('SESSDATA', '')
            bili_jct = self.config.get('bili_jct', '')
            if sessdata and bili_jct:
                cookie = f"SESSDATA={sessdata}; bili_jct={bili_jct};"
        
        return {
            "cookie": cookie,
            "aiServerUrl": "http://192.168.1.3:10650",
            "imageUrl": self.config.get('viewsight_image_url', ''),
            "imageToken": self.config.get('viewsight_image_token', ''),
            "imageModel": self.config.get('viewsight_image_model', ''),
            "backendUrl": self.config.get('viewsight_backend_url', ''),
        }
    
    def predict_video_views(self, bvid):
        """预测视频播放量
        
        Args:
            bvid: B站视频BV号
            
        Returns:
            dict: 预测结果，包含预测播放量和相关信息
            
        Raises:
            Exception: 当API调用失败时抛出
        """
        try:
            # 调用 ViewSight API 的 analyze_video_link 接口
            endpoint = f"{self.server_url}/analyze_video_link"
            
            # 确保BV号格式正确
            if not bvid.startswith('BV'):
                # 检查是否是完整链接
                if 'bilibili.com/video/' in bvid:
                    for part in bvid.split('/'):
                        if part.startswith('BV'):
                            bvid = part
                            break
            
            logger.info(f"准备预测视频: {bvid}")
            
            # 准备请求配置 - 确保至少有cookie字段，即使是空的
            config = self.format_viewsight_config()
            if "cookie" not in config:
                config["cookie"] = ""
                
            logger.info(f"使用配置: {json.dumps({k: '***' if k in ['cookie', 'token', 'imageToken'] else v for k, v in config.items()})}")
            
            # 确保提供最基本的配置
            payload = {
                "videoLink": bvid,
                "config": config
            }
            
            logger.info(f"发送预测请求到 {endpoint}")
            
            # 设置较长的超时时间，因为预测过程可能需要较长时间
            response = requests.post(
                endpoint, 
                json=payload, 
                timeout=120,  # 增加超时时间到120秒
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'BiliBrother-Prediction-Client/1.0'
                }
            )
            
            if response.status_code != 200:
                logger.error(f"预测请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text}")
                error_msg = f"预测API返回错误 (状态码: {response.status_code}): {response.text}"
                if response.status_code == 500:
                    error_msg = "服务器内部错误，请检查ViewSight服务是否正常运行及配置是否正确"
                elif response.status_code == 400:
                    error_msg = "请求参数错误，请检查BV号和配置信息"
                elif response.status_code == 404:
                    error_msg = "API接口不存在，请确认ViewSight服务地址是否正确"
                raise Exception(error_msg)
                
            try:
                result = response.json()
            except ValueError:
                logger.error(f"响应不是有效的JSON格式: {response.text[:200]}...")
                raise Exception(f"API响应格式错误，无法解析JSON: {response.text[:100]}...")
            
            # 检查是否有错误信息
            if 'error' in result:
                logger.error(f"API返回错误: {result['error']}")
                raise Exception(f"预测API返回错误: {result['error']}")
            
            logger.info(f"成功获取预测结果，预测播放量: {result.get('predicted_play_count', 'N/A')}")
            
            # 格式化返回结果
            return {
                "bvid": bvid,
                "predicted_play_count": result.get("predicted_play_count", 0),
                "range_score": result.get("range_score", ""),
                "estimated7DayViews": result.get("estimated7DayViews", ""),
                "trending_analysis": result.get("trending_analysis", {}),
                "prediction_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "raw_regression": result.get("raw_regression", 0),
                "post_processed": result.get("post_processed", 0),
                "raw_message": result.get("message", "")
            }
            
        except requests.exceptions.Timeout:
            logger.error(f"预测请求超时")
            raise Exception("预测请求超时，ViewSight服务响应时间过长")
        except requests.exceptions.ConnectionError:
            logger.error(f"无法连接到ViewSight服务器")
            raise Exception(f"无法连接到ViewSight服务器 {self.server_url}，请检查服务是否可用")
        except Exception as e:
            logger.error(f"预测视频播放量失败: {str(e)}")
            raise Exception(f"预测视频播放量失败: {str(e)}")
