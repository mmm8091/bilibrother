import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:10000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 获取ViewSight配置
 * @returns {Promise<Object>} ViewSight配置信息
 */
export const getViewSightConfig = async () => {
  try {
    const response = await api.get('/config/viewsight');
    return response.data;
  } catch (error) {
    console.error('获取ViewSight配置失败:', error);
    throw error;
  }
};

/**
 * 更新ViewSight配置
 * @param {Object} configData 更新的配置数据
 * @returns {Promise<Object>} 更新结果
 */
export const updateViewSightConfig = async (configData) => {
  try {
    const response = await api.post('/config/viewsight', configData);
    return response.data;
  } catch (error) {
    console.error('更新ViewSight配置失败:', error);
    throw error;
  }
};

/**
 * 预测视频播放量
 * @param {string} bvid B站视频BV号
 * @returns {Promise<Object>} 预测结果
 */
export const predictVideoViews = async (bvid) => {
  try {
    const response = await api.get(`/predict/${bvid}`);
    return response.data;
  } catch (error) {
    console.error(`预测视频 ${bvid} 播放量失败:`, error);
    throw error;
  }
};

/**
 * 获取特定视频的预测信息
 * @param {string} bvid B站视频BV号
 * @returns {Promise<Object>} 预测结果
 */
export const getVideoPrediction = async (bvid) => {
  try {
    const response = await api.get(`/videos/${bvid}/prediction`);
    return response.data;
  } catch (error) {
    console.error(`获取视频 ${bvid} 预测信息失败:`, error);
    throw error;
  }
};
