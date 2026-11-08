import { useEffect, useState } from 'react';
import {
  AlertCircle, ArrowRight, Check, ClipboardPaste, ExternalLink, Link2, ListPlus,
  Loader2, Plus, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useToast } from '../components/ui/ToastProvider';
import { useShelf } from '../hooks/useShelf';
import { checkServer, extractArticle } from '../lib/api';
import { articleFromExtraction, articleFromManual } from '../lib/articleFactory';
import {
  getManualQueue, popManualQueue, pushManualQueue, articlesRepo,
} from '../lib/db';
import { canonicalUrl, extractUrls, isValidHttpUrl } from '../lib/url';
import type { Article, ManualQueueItem } from '../types';

type BatchState = 'waiting' | 'fetching' | 'success' | 'failed' | 'duplicate';
interface BatchItem {
  url: string;
  state: BatchState;
  title?: string;
  error?: string;
}

const STATE_LABEL: Record<BatchState, string> = {
  waiting: '等待处理',
  fetching: '正在抓取',
  success: '添加成功',
  failed: '抓取失败',
  duplicate: '已在书架',
};

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : '抓取失败，原因未知';
}

export default function AddArticlePage() {
  const { addArticle } = useShelf();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleError, setSingleError] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [lastAdded, setLastAdded] = useState<Article | null>(null);
  const [batchText, setBatchText] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [queue, setQueue] = useState<ManualQueueItem[]>([]);
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    void getManualQueue().then(setQueue);
    void checkServer().then(setServerOk);
  }, []);

  const putInQueue = async (url: string, error: string) => {
    setQueue(await pushManualQueue({ url, error, addedAt: Date.now() }));
  };

  const addSingle = async () => {
    setSingleError('');
    setLastAdded(null);
    if (!isValidHttpUrl(singleUrl)) {
      setSingleError('URL 格式不正确，请粘贴完整的 http(s) 文章链接。');
      return;
    }
    const url = canonicalUrl(singleUrl);
    const existing = await articlesRepo.findByUrl(url);
    if (existing) {
      setSingleError('这个 URL 已经在书架里了，无需重复添加。');
      return;
    }
    setSingleLoading(true);
    try {
      const data = await extractArticle(url);
      const article = articleFromExtraction(data);
      await addArticle(article);
      setSingleUrl('');
      setLastAdded(article);
      toast('已放上书架', 'success');
    } catch (error) {
      const message = friendlyError(error);
      setSingleError(message);
      await putInQueue(url, message);
    } finally {
      setSingleLoading(false);
    }
  };

  const startBatch = async () => {
    const urls = extractUrls(batchText);
    if (urls.length === 0) {
      toast('请先粘贴至少一个 URL', 'error');
      return;
    }
    const items: BatchItem[] = urls.map((raw) => {
      if (!isValidHttpUrl(raw)) {
        return { url: raw, state: 'failed', error: 'URL 格式不正确，已跳过' };
      }
      return { url: canonicalUrl(raw), state: 'waiting' };
    });

    setBatchItems(items);
    setProcessed(0);
    setProcessing(true);

    const update = (index: number, patch: Partial<BatchItem>) => {
      setBatchItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };
    let cursor = 0;
    let added = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const index = cursor++;
        const item = items[index];
        if (item.state === 'failed') {
          setProcessed((n) => n + 1);
          continue;
        }
        update(index, { state: 'fetching', error: undefined });
        try {
          const existing = await articlesRepo.findByUrl(item.url);
          if (existing) {
            update(index, { state: 'duplicate', error: '该 URL 已在书架中，已跳过' });
          } else {
            const data = await extractArticle(item.url);
            const article = articleFromExtraction(data);
            await addArticle(article);
            added += 1;
            update(index, { state: 'success', title: article.title });
          }
        } catch (error) {
          const message = friendlyError(error);
          update(index, { state: 'failed', error: message });
          await putInQueue(item.url, message);
        } finally {
          setProcessed((n) => n + 1);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(3, items.length) }, () => worker()));
    setQueue(await getManualQueue());
    setProcessing(false);
    toast(`处理完成：新增 ${added} 篇，其余请查看状态`, added > 0 ? 'success' : 'info');
  };

  const openManual = (url: string) => {
    setManualFor(url);
    setManualTitle('');
    setManualBody('');
  };

  const saveManual = async () => {
    if (!manualFor) return;
    if (!manualBody.trim()) {
      toast('请先粘贴文章正文', 'error');
      return;
    }
    const article = articleFromManual({ url: manualFor, title: manualTitle, body: manualBody });
    await addArticle(article);
    setQueue(await popManualQueue(manualFor));
    setBatchItems((prev) =>
      prev.map((item) =>
        item.url === manualFor ? { ...item, state: 'success', title: article.title, error: undefined } : item
      )
    );
    setLastAdded(article);
    setManualFor(null);
    setManualTitle('');
    setManualBody('');
    toast('已手动补录并放上书架', 'success');
  };

  const removeFromQueue = async (url: string) => {
    setQueue(await popManualQueue(url));
    if (manualFor === url) setManualFor(null);
  };

  return (
    <AppShell>
      <div className="page">
        <header className="page-head">
          <div>
            <div className="eyebrow">ADD TO THE SHELF</div>
            <h1 className="page-title">添加文章</h1>
            <p className="page-sub">粘贴网址，由本地抓取服务提取正文；内容只保存在这台设备上。</p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn" onClick={() => navigate('/')}>
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> 回到书架
            </button>
          </div>
        </header>

        {serverOk === false && (
          <div className="locate-warning" style={{ maxWidth: 'none', marginBottom: 20 }}>
            <AlertCircle size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            抓取服务未响应。请在项目根目录执行 <strong>npm run dev</strong>（或 <strong>npm run build &amp;&amp; npm start</strong>）后重试。
          </div>
        )}

        <div className="add-layout">
          <div>
            <div className="seg" style={{ marginBottom: 18 }} role="group" aria-label="添加方式">
              <button type="button" className={mode === 'single' ? 'is-active' : ''} onClick={() => setMode('single')}>
                <Link2 size={14} /> 单篇添加
              </button>
              <button type="button" className={mode === 'batch' ? 'is-active' : ''} onClick={() => setMode('batch')}>
                <ListPlus size={14} /> 批量添加
              </button>
            </div>

            {mode === 'single' ? (
              <section className="add-panel">
                <div className="add-panel__head">
                  <Plus size={17} strokeWidth={1.5} />
                  <h2>收藏一篇文章</h2>
                  <span className="eyebrow">SINGLE URL</span>
                </div>
                <label className="field-label" htmlFor="single-url">文章网址</label>
                <div className="add-row">
                  <input
                    id="single-url"
                    className="input"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://example.com/article"
                    value={singleUrl}
                    onChange={(e) => { setSingleUrl(e.target.value); setSingleError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !singleLoading) void addSingle(); }}
                  />
                  <button type="button" className="btn btn--primary" onClick={() => void addSingle()} disabled={singleLoading}>
                    {singleLoading ? <Loader2 className="spinner" size={15} /> : <Plus size={15} />}
                    {singleLoading ? '正在抓取…' : '添加到书架'}
                  </button>
                </div>
                {singleError && (
                  <div style={{ marginTop: 12 }}>
                    <p className="error-text"><AlertCircle size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />{singleError}</p>
                    <div className="batch-item__actions">
                      <a className="btn btn--sm" href={isValidHttpUrl(singleUrl) ? singleUrl : undefined} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} /> 打开原网页
                      </a>
                      <button type="button" className="btn btn--sm" onClick={() => openManual(canonicalUrl(singleUrl))} disabled={!isValidHttpUrl(singleUrl)}>
                        <ClipboardPaste size={13} /> 手动粘贴正文
                      </button>
                    </div>
                  </div>
                )}
                {lastAdded && (
                  <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--paper-sunk)', border: '1px solid var(--line)' }}>
                    <div className="batch-item__title">{lastAdded.title}</div>
                    <p className="hint" style={{ margin: '4px 0 10px' }}>
                      {lastAdded.wordCount} 字 · 约 {lastAdded.estReadMinutes} 分钟 · 已放上书架
                    </p>
                    <button type="button" className="btn btn--sm btn--brass" onClick={() => navigate(`/read/${lastAdded.id}`)}>
                      立即阅读 <ArrowRight size={13} />
                    </button>
                  </div>
                )}
                <hr className="rule" style={{ margin: '22px 0 16px' }} />
                <p className="hint">抓取由你主动触发；后端会提取标题、站点名、正文 HTML、纯文本、字数与预计阅读时长。</p>
              </section>
            ) : (
              <section className="add-panel">
                <div className="add-panel__head">
                  <ListPlus size={17} strokeWidth={1.5} />
                  <h2>一次粘贴多个网址</h2>
                  <span className="eyebrow">BATCH</span>
                </div>
                <label className="field-label" htmlFor="batch-urls">每行一个 URL，也可用空格 / 逗号分隔</label>
                <textarea
                  id="batch-urls"
                  className="textarea"
                  style={{ minHeight: 132 }}
                  inputMode="url"
                  placeholder={'https://example.com/a\nhttps://example.com/b\nhttps://example.com/c'}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  disabled={processing}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--primary" onClick={() => void startBatch()} disabled={processing}>
                    {processing ? <Loader2 className="spinner" size={15} /> : <ListPlus size={15} />}
                    {processing ? '正在抓取…' : '开始抓取'}
                  </button>
                  <button type="button" className="btn" onClick={() => { setBatchText(''); setBatchItems([]); setProcessed(0); }} disabled={processing}>
                    清空
                  </button>
                  <span className="hint" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
                    并发 3 条，单条失败不影响其他
                  </span>
                </div>

                {batchItems.length > 0 && (
                  <div className="add-progress">
                    <div className="hint">抓取进度：{processed} / {batchItems.length}</div>
                    <div className="add-progress__track">
                      <div className="add-progress__fill" style={{ width: `${(processed / batchItems.length) * 100}%` }} />
                    </div>
                    <div className="batch-list">
                      {batchItems.map((item, index) => (
                        <div className="batch-item" key={`${item.url}-${index}`}>
                          <div className="batch-item__top">
                            <span className={`batch-state batch-state--${item.state === 'duplicate' ? 'failed' : item.state}`}>
                              {item.state === 'fetching' && <span className="spinner" />}
                              {item.state === 'success' && <Check size={12} />}
                              {item.state === 'failed' && <AlertCircle size={12} />}
                              {STATE_LABEL[item.state]}
                            </span>
                            <span className="batch-item__url" title={item.url}>{item.url}</span>
                          </div>
                          {item.title && <div className="batch-item__title">{item.title}</div>}
                          {item.error && <div className="batch-item__error">{item.error}</div>}
                          {(item.state === 'failed' || item.state === 'duplicate') && (
                            <div className="batch-item__actions">
                              <a className="btn btn--sm" href={isValidHttpUrl(item.url) ? item.url : undefined} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={13} /> 打开原网页
                              </a>
                              {item.state === 'failed' && (
                                <button type="button" className="btn btn--sm" onClick={() => openManual(item.url)}>
                                  <ClipboardPaste size={13} /> 手动粘贴正文
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {queue.length > 0 && (
              <section className="add-panel" style={{ marginTop: 20 }}>
                <div className="add-panel__head">
                  <AlertCircle size={17} strokeWidth={1.5} />
                  <h2>待手动处理 · {queue.length}</h2>
                  <span className="eyebrow">NEEDS ATTENTION</span>
                </div>
                <p className="hint" style={{ marginBottom: 10 }}>
                  这些网址抓取失败但已保留。可以打开原网页复制正文后手动补录，处理完成会自动移出队列。
                </p>
                {queue.map((item) => (
                  <div className="batch-item" key={item.url}>
                    <div className="batch-item__top">
                      <span className="batch-item__url" title={item.url}>{item.url}</span>
                      <button type="button" className="icon-btn" aria-label="移除" onClick={() => void removeFromQueue(item.url)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="batch-item__error">{item.error}</div>
                    <div className="batch-item__actions">
                      <a className="btn btn--sm" href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} /> 打开原网页
                      </a>
                      <button type="button" className="btn btn--sm" onClick={() => openManual(item.url)}>
                        <ClipboardPaste size={13} /> 手动粘贴正文
                      </button>
                    </div>

                    {manualFor === item.url && (
                      <div className="manual-form">
                        <label className="field-label" htmlFor="manual-title">文章标题（可选）</label>
                        <input
                          id="manual-title"
                          className="input"
                          placeholder="留空则使用域名"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                        />
                        <label className="field-label" htmlFor="manual-body" style={{ marginTop: 12 }}>文章正文</label>
                        <textarea
                          id="manual-body"
                          className="textarea"
                          style={{ minHeight: 170 }}
                          placeholder="把原文复制粘贴到这里，空行会分段…"
                          value={manualBody}
                          onChange={(e) => setManualBody(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => void saveManual()}>
                            <Check size={13} /> 保存正文
                          </button>
                          <button type="button" className="btn btn--sm" onClick={() => setManualFor(null)}>取消</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className="add-side">
            <div className="add-side__block">
              <h3>它是怎么工作的</h3>
              <ol>
                <li>你粘贴一个文章网址</li>
                <li>本地 Express 服务抓取该网页</li>
                <li>Readability 提取正文与元信息</li>
                <li>中文按字、英文按词估算时长</li>
                <li>文章写入浏览器 IndexedDB</li>
              </ol>
            </div>
            <div className="add-side__block">
              <h3>关于隐私</h3>
              <p>
                没有账号、没有云同步、没有后台静默上传。只有你点击「添加」时才会发出抓取请求；
                阅读内容、进度、划线与批注全部留在本机。
              </p>
            </div>
            <div className="add-side__block">
              <h3>抓取失败怎么办</h3>
              <p>
                登录墙、纯 JS 渲染或反爬限制都可能导致失败。失败的网址会保留在「待手动处理」，
                你可以打开原网页复制正文，手动补录成一本书。
              </p>
            </div>
            <div className="add-side__block">
              <h3>阅读时长估算</h3>
              <p>中日韩文字约 350 字 / 分钟，拉丁文字约 220 词 / 分钟，混合文章分别计算后相加。</p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
