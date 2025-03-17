// 存储词频数据的对象
let wordFrequencyData = {};
let isFrequencyDataLoaded = false;
let isLoading = false;

/**
 * 加载词频数据
 * @returns {Promise<boolean>}
 */
async function loadWordFrequencyData() {
    if (isFrequencyDataLoaded) {
        return Promise.resolve(true);
    }
    
    if (isLoading) {
        return new Promise((resolve, reject) => {
            const checkLoaded = () => {
                if (isFrequencyDataLoaded) {
                    resolve(true);
                } else if (!isLoading) {
                    reject(new Error('加载词频数据失败'));
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            setTimeout(checkLoaded, 100);
        });
    }
    
    isLoading = true;
    console.log('开始加载词频数据...');
    
    try {
        const response = await fetch('tools/wordfrequency/SUBTLEX_CH.utf8');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('成功获取词频数据文件');
        
        // 解析数据
        const lines = text.split('\n');
        console.log(`总行数: ${lines.length}`);
        
        let processedLines = 0;
        for (const line of lines) {
            if (line.trim()) {
                const [word, length, pinyin, pinyinInput, wCount, wMillion, log10W, wCD, wCDPercent, 
                       log10CD, dominantPOS, dominantPOSFreq, allPOS, allPOSFreq, engTran] = line.split('\t');
                
                if (word && wCount) {
                    wordFrequencyData[word] = {
                        word: word,
                        length: length,
                        pinyin: pinyin,
                        pinyinInput: pinyinInput,
                        wCount: wCount,
                        wMillion: wMillion,
                        log10W: log10W,
                        wCD: wCD,
                        wCDPercent: wCDPercent,
                        log10CD: log10CD,
                        dominantPOS: dominantPOS,
                        dominantPOSFreq: dominantPOSFreq,
                        allPOS: allPOS,
                        allPOSFreq: allPOSFreq,
                        engTran: engTran
                    };
                }
            }
            processedLines++;
            if (processedLines % 10000 === 0) {
                console.log(`已处理 ${processedLines} 行`);
            }
        }
        
        console.log(`词频数据加载完成，共处理 ${processedLines} 行`);
        isFrequencyDataLoaded = true;
        return true;
    } catch (error) {
        console.error('加载词频数据时出错:', error);
        return false;
    } finally {
        isLoading = false;
    }
}

/**
 * 查找词频信息
 * @param {string[]} words - 要查找的词列表
 * @returns {Promise<Array>}
 */
async function findWordFrequency(words) {
    // 确保词频数据已加载
    if (!isFrequencyDataLoaded) {
        await loadWordFrequencyData();
    }
    
    const results = [];
    for (const word of words) {
        const data = wordFrequencyData[word];
        if (data) {
            results.push(data);
        } else {
            results.push({
                word: word,
                length: '未找到',
                pinyin: '未找到',
                pinyinInput: '未找到',
                wCount: '未找到',
                wMillion: '未找到',
                log10W: '未找到',
                wCD: '未找到',
                wCDPercent: '未找到',
                log10CD: '未找到',
                dominantPOS: '未找到',
                dominantPOSFreq: '未找到',
                allPOS: '未找到',
                allPOSFreq: '未找到',
                engTran: '未找到'
            });
        }
    }
    
    // 按词频降序排序
    results.sort((a, b) => {
        if (a.wCount === '未找到' || b.wCount === '未找到') return 0;
        return parseFloat(b.wCount) - parseFloat(a.wCount);
    });
    
    return results;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('页面加载完成，开始初始化...');
    const findFrequencyBtn = document.getElementById('findFrequencyBtn');
    const frequencyLoadingIndicator = document.getElementById('frequencyLoadingIndicator');
    const frequencyResults = document.getElementById('frequencyResults');
    const frequencyResultsTable = document.getElementById('frequencyResultsTable').getElementsByTagName('tbody')[0];
    const frequencyError = document.getElementById('frequencyError');
    
    if (!findFrequencyBtn || !frequencyLoadingIndicator || !frequencyResults || !frequencyResultsTable || !frequencyError) {
        console.error('找不到必要的DOM元素');
        return;
    }
    
    // 加载词频数据
    frequencyLoadingIndicator.style.display = 'flex';
    frequencyError.style.display = 'none';
    
    const success = await loadWordFrequencyData();
    
    if (!success) {
        frequencyError.textContent = '加载词频数据失败，请刷新页面重试';
        frequencyError.style.display = 'block';
        frequencyLoadingIndicator.style.display = 'none';
        return;
    }
    
    frequencyLoadingIndicator.style.display = 'none';
    
    // 添加按钮点击事件
    findFrequencyBtn.addEventListener('click', async function() {
        console.log('查找按钮被点击');
        const input = document.getElementById('frequencyWords').value;
        if (!input.trim()) {
            frequencyError.textContent = '请输入要查找的词';
            frequencyError.style.display = 'block';
            return;
        }
        
        const words = input.split(/[,，]/).map(word => word.trim()).filter(word => word);
        console.log(`输入的词: ${words.join(', ')}`);
        
        // 显示加载指示器
        frequencyLoadingIndicator.style.display = 'flex';
        frequencyResults.style.display = 'none';
        
        try {
            const results = await findWordFrequency(words);
            
            // 清空并更新结果表格
            frequencyResultsTable.innerHTML = '';
            
            results.forEach(result => {
                const row = frequencyResultsTable.insertRow();
                row.innerHTML = `
                    <td>${result.word}</td>
                    <td>${result.length}</td>
                    <td>${result.pinyin}</td>
                    <td>${result.pinyinInput}</td>
                    <td>${result.wCount}</td>
                    <td>${result.wMillion}</td>
                    <td>${result.log10W}</td>
                    <td>${result.wCD}</td>
                    <td>${result.wCDPercent}</td>
                    <td>${result.log10CD}</td>
                    <td>${result.dominantPOS}</td>
                    <td>${result.dominantPOSFreq}</td>
                    <td>${result.allPOS}</td>
                    <td>${result.allPOSFreq}</td>
                    <td>${result.engTran}</td>
                `;
            });
            
            // 显示结果容器
            frequencyResults.style.display = 'block';
            frequencyError.style.display = 'none';
        } catch (error) {
            frequencyError.textContent = '查找词频时出错: ' + error.message;
            frequencyError.style.display = 'block';
        } finally {
            frequencyLoadingIndicator.style.display = 'none';
        }
    });
}); 