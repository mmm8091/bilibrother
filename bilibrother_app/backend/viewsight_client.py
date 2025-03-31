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
        self.server_url = self.config.get('viewsight_server_url', 'http://localhost:4432')
        
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
                'viewsight_backend_url',
                'viewsight_token',
                'viewsight_model'
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
        return {
            "cookie": self.config.get('bilibili_cookie', ''),
            "aiServerUrl": self.server_url,
            "imageUrl": self.config.get('viewsight_image_url', ''),
            "imageToken": self.config.get('viewsight_image_token', ''),
            "imageModel": self.config.get('viewsight_image_model', ''),
            "backendUrl": self.config.get('viewsight_backend_url', ''),
            "token": self.config.get('viewsight_token', ''),
            "model": self.config.get('viewsight_model', '')
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
            payload = {
                "videoLink": bvid,
                "config": self.format_viewsight_config()
            }
            
            logger.info(f"发送预测请求到 {endpoint} 预测视频 {bvid}")
            response = requests.post(endpoint, json=payload, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"预测请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text}")
                raise Exception(f"预测API返回错误: {response.text}")
                
            result = response.json()
            logger.info(f"获取预测结果: {result}")
            
            # 格式化返回结果
            return {
                "bvid": bvid,
                "predicted_play_count": result.get("predicted_play_count", 0),
                "range_score": result.get("range_score", ""),
                "estimated7DayViews": result.get("estimated7DayViews", ""),
                "trending_analysis": result.get("trending_analysis", {}),
                "prediction_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "raw_message": result.get("message", "")
            }
            
        except Exception as e:
            logger.error(f"预测视频播放量失败: {str(e)}")
            raise Exception(f"预测视频播放量失败: {str(e)}")
