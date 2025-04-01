import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:10000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchVideos = async () => {
  try {
    const response = await api.get('/videos');
    return response.data;
  } catch (error) {
    console.error('获取视频列表失败:', error);
    throw error;
  }
};

export const addVideo = async (bvid) => {
  try {
    const response = await api.post('/videos', { bvid });
    return response.data;
  } catch (error) {
    console.error('添加视频失败:', error);
    throw error;
  }
};

export const deleteVideo = async (bvid) => {
  try {
    const response = await api.delete(`/videos/${bvid}`);
    return response.data;
  } catch (error) {
    console.error(`删除视频 ${bvid} 失败:`, error);
    throw error;
  }
};

export const refreshVideos = async (bvids = []) => {
  try {
    const response = await api.post('/videos/refresh', { bvids });
    return response.data;
  } catch (error) {
    console.error('刷新视频失败:', error);
    throw error;
  }
};

export const getConfig = async () => {
  try {
    const response = await api.get('/config');
    return response.data;
  } catch (error) {
    console.error('获取配置失败:', error);
    throw error;
  }
};

export const updateConfig = async (key, value) => {
  try {
    const response = await api.put(`/config/${key}`, { value });
    return response.data;
  } catch (error) {
    console.error(`更新配置 ${key} 失败:`, error);
    throw error;
  }
};

export const exportData = async (format = 'json') => {
  try {
    const response = await api.get(`/export?format=${format}`);
    
    // 如果是CSV格式，返回响应对象用于处理下载
    if (format === 'csv') {
      return response;
    }
    
    // JSON格式直接返回数据
    return response.data;
  } catch (error) {
    console.error('导出数据失败:', error);
    throw error;
  }
};
