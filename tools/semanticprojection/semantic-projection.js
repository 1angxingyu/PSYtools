// 存储词向量的对象
let wordEmbeddings = {};
let isEmbeddingsLoaded = false;
let isLoading = false;
let currentCorpus = null;

/**
 * 从本地文件加载词向量
 * @param {string} corpusType - 语料库类型 ('wiki', 'baidu', 或 'merge')
 * @returns {Promise<void>}
 */
async function loadWordEmbeddings(corpusType) {
    if (isEmbeddingsLoaded && currentCorpus === corpusType) {
        return Promise.resolve(); // 如果已加载相同的语料库，立即返回
    }
    
    if (isLoading) {
        // 如果正在加载，返回一个新的 Promise，等待加载完成
        return new Promise((resolve, reject) => {
            const checkLoaded = () => {
                if (isEmbeddingsLoaded && currentCorpus === corpusType) {
                    resolve();
                } else if (!isLoading) {
                    reject(new Error('加载词向量失败'));
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            setTimeout(checkLoaded, 100);
        });
    }
    
    isLoading = true;
    console.log('开始加载词向量文件...');
    
    // 根据语料库类型选择文件路径
    let filePaths;
    switch(corpusType) {
        case 'wiki':
            filePaths = [
                'tools/semanticprojection/wiki_filtered_1.txt',
                'tools/semanticprojection/wiki_filtered_2.txt'
            ];
            break;
        case 'baidu':
            filePaths = [
                'tools/semanticprojection/baiduw2v_filtered_1.txt',
                'tools/semanticprojection/baiduw2v_filtered_2.txt'
            ];
            break;
        case 'merge':
            filePaths = [
                'tools/semanticprojection/merge_filtered_1.txt',
                'tools/semanticprojection/merge_filtered_2.txt'
            ];
            break;
        default:
            throw new Error('无效的语料库类型');
    }
    
    try {
        // 清空之前的词向量
        wordEmbeddings = {};
        
        // 加载所有文件
        for (const filePath of filePaths) {
            console.log(`正在加载文件: ${filePath}`);
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`无法加载词向量文件: ${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log(`成功加载文本，长度: ${text.length} 字符`);
            
            const lines = text.trim().split('\n');
            console.log(`文件包含 ${lines.length} 行`);
            
            // 解析每一行
            let processedLines = 0;
            for (const line of lines) {
                const parts = line.trim().split(' ');
                if (parts.length < 2) continue;
                
                const word = parts[0];
                const embedding = parts.slice(1).map(Number);
                
                // 存储词向量
                wordEmbeddings[word] = embedding;
                
                processedLines++;
                if (processedLines % 10000 === 0) {
                    console.log(`已处理 ${processedLines} 行...`);
                }
            }
            
            console.log(`已处理 ${processedLines} 行`);
        }
        
        isEmbeddingsLoaded = true;
        currentCorpus = corpusType;
        console.log(`已加载 ${Object.keys(wordEmbeddings).length} 个词向量`);
    } catch (error) {
        console.error('加载词向量时出错:', error);
        throw new Error(`加载词向量失败: ${error.message}`);
    } finally {
        isLoading = false;
    }
}

/**
 * 计算两个向量的点积
 * @param {number[]} vec1 - 第一个向量
 * @param {number[]} vec2 - 第二个向量
 * @returns {number} - 点积
 */
function dotProduct(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error('向量必须具有相同的维度');
    }
    
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        sum += vec1[i] * vec2[i];
    }
    
    return sum;
}

/**
 * 计算向量的模长
 * @param {number[]} vec - 向量
 * @returns {number} - 模长
 */
function magnitude(vec) {
    return Math.sqrt(dotProduct(vec, vec));
}

/**
 * 计算向量的模长的平方
 * @param {number[]} vec - 向量
 * @returns {number} - 模长的平方
 */
function magnitudeSquared(vec) {
    return dotProduct(vec, vec);
}

/**
 * 将向量归一化为单位长度
 * @param {number[]} vec - 要归一化的向量
 * @returns {number[]} - 归一化后的向量
 */
function normalize(vec) {
    const mag = magnitude(vec);
    return vec.map(value => value / mag);
}

/**
 * 按照Python代码的逻辑计算语义维度向量
 * @param {string[]} largerWords - 大词列表
 * @param {string[]} smallerWords - 小词列表
 * @returns {number[]} - 语义维度向量
 */
function calculateSemanticDimension(largerWords, smallerWords) {
    const vectors = [];
    
    // 计算每一对大词和小词的向量差
    for (const largeWord of largerWords) {
        if (!wordEmbeddings[largeWord]) continue;
        
        for (const smallWord of smallerWords) {
            if (!wordEmbeddings[smallWord]) continue;
            
            const largeVector = wordEmbeddings[largeWord];
            const smallVector = wordEmbeddings[smallWord];
            
            // 计算向量差 (大词 - 小词)
            const sizeVector = largeVector.map((value, i) => value - smallVector[i]);
            vectors.push(sizeVector);
        }
    }
    
    if (vectors.length === 0) {
        throw new Error('没有有效的词对来计算语义维度');
    }
    
    // 计算所有向量差的平均值
    const dimension = Array(vectors[0].length).fill(0);
    for (const vector of vectors) {
        for (let i = 0; i < dimension.length; i++) {
            dimension[i] += vector[i];
        }
    }
    
    return dimension.map(value => value / vectors.length);
}

/**
 * 计算目标词在由大词和小词定义的语义维度上的投影
 * @param {string[]} largerWords - 大词列表
 * @param {string[]} smallerWords - 小词列表
 * @param {string[]} targetWords - 目标词列表
 * @returns {Promise<Array<{word: string, value: number}>>} - 投影结果
 */
async function calculateSemanticProjection(largerWords, smallerWords, targetWords) {
    // 确保词向量已加载
    if (!isEmbeddingsLoaded) {
        await loadWordEmbeddings();
    }
    
    try {
        // 计算语义维度向量
        const averageVector = calculateSemanticDimension(largerWords, smallerWords);
        
        // 计算语义维度向量的模长（用于标准化）
        const sizeMagnitude = magnitude(averageVector);
        
        // 计算目标词的投影
        const results = [];
        
        for (const word of targetWords) {
            if (wordEmbeddings[word]) {
                const vector = wordEmbeddings[word];
                
                // 计算标准化后的投影值（点积除以模长）
                const projectionValue = dotProduct(averageVector, vector) / sizeMagnitude;
                
                results.push({ word, value: projectionValue });
            } else {
                results.push({ word, value: NaN });
            }
        }
        
        // 按投影值排序（降序）
        results.sort((a, b) => {
            if (isNaN(a.value) && isNaN(b.value)) return 0;
            if (isNaN(a.value)) return 1;
            if (isNaN(b.value)) return -1;
            return b.value - a.value;
        });
        
        return results;
    } catch (error) {
        console.error('计算语义投影时出错:', error);
        throw error;
    }
} 