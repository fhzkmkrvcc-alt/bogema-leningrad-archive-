import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Search, Plus, X, ArrowLeft, LogIn, LogOut, Pencil, Trash2, ImagePlus, Archive, ArrowUpRight } from 'lucide-react';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const blank = { title:'', brand:'', category:'Другое', year:'', description:'', tags:'' };
const categories = ['Все предметы','Кофты','Джинсы','Верхняя одежда','Футболки','Лонгсливы','Свитшоты','Обувь','Головные уборы','Аксессуары','Сумки','Другое'];
const photoCategory = 'Фото';

function App() {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('Все предметы');
  const [selected,setSelected] = useState(null);
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(blank);
  const [photos,setPhotos] = useState([]);
  const [existingPhotos,setExistingPhotos] = useState([]);
  const [session,setSession] = useState(null);
  const [loginOpen,setLoginOpen] = useState(false);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [message,setMessage] = useState('');
  const [saving,setSaving] = useState(false);

  async function loadItems() {
    if (!supabase) { setLoading(false); return; }
    const { data,error } = await supabase.from('items').select('*').order('created_at',{ascending:false});
    if (error) setMessage(error.message); else setItems(data || []);
    setLoading(false);
  }
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => setSession(s));
    loadItems();
    return () => subscription.unsubscribe();
  }, []);
  const filtered = useMemo(() => items.filter(item => {
    const haystack = [item.title,item.brand,item.category,item.year,item.description,item.tags].join(' ').toLowerCase();
    const matchesCategory = category === 'Все предметы' || (category === photoCategory ? (item.image_urls || []).length > 0 : item.category === category);
    return matchesCategory && haystack.includes(search.toLowerCase());
  }),[items,search,category]);

  function openNew() { setEditing(null); setForm(blank); setPhotos([]); setExistingPhotos([]); setModal(true); setMessage(''); }
  function openEdit(item) { setEditing(item); setForm({title:item.title||'',brand:item.brand||'',category:item.category||'Другое',year:item.year||'',description:item.description||'',tags:item.tags||''}); setPhotos([]); setExistingPhotos(item.image_urls||[]); setModal(true); setSelected(null); setMessage(''); }
  async function signIn(e) {
    e.preventDefault(); if (!supabase) return;
    const {error} = await supabase.auth.signInWithPassword({email,password});
    if(error) setMessage(error.message); else {setLoginOpen(false);setPassword('');setMessage('');}
  }
  async function signOut() { if(supabase) await supabase.auth.signOut(); }
  async function saveItem(e) {
    e.preventDefault();
    if(!supabase) { setMessage('Сначала подключите Supabase по инструкции в README.md.'); return; }
    if(!session) { setMessage('Войдите в панель администратора.'); return; }
    setSaving(true); setMessage('');
    try {
      const uploaded = [];
      for (const file of photos) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
        const path = `${crypto.randomUUID()}-${safe}`;
        const {error} = await supabase.storage.from('archive-photos').upload(path,file,{upsert:false});
        if(error) throw error;
        const {data} = supabase.storage.from('archive-photos').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      const payload = {...form,image_urls:[...existingPhotos,...uploaded]};
      const result = editing
        ? await supabase.from('items').update(payload).eq('id',editing.id)
        : await supabase.from('items').insert(payload);
      if(result.error) throw result.error;
      setModal(false); setEditing(null); await loadItems();
    } catch(err) { setMessage(err.message || 'Не удалось сохранить предмет.'); }
    finally { setSaving(false); }
  }
  async function deleteItem(item) {
    if(!supabase || !session || !confirm(`Удалить «${item.title}» из архива?`)) return;
    const {error} = await supabase.from('items').delete().eq('id',item.id);
    if(error) setMessage(error.message); else {setSelected(null);await loadItems();}
  }

  return <div className="app">
    <header className="topbar">
      <a className="brandmark" href="#" onClick={e=>{e.preventDefault();setSelected(null);setCategory('Все предметы')}}><span>Богема Ленинград Архив</span><span className="brand-sub">{items.length} предметов в каталоге</span></a>
      <div className="top-actions"><span className="status"><i/>ОТКРЫТЫЙ АРХИВ</span>{session ? <button className="icon-btn" title="Выйти" onClick={signOut}><LogOut size={17}/></button> : <button className="icon-btn" title="Вход администратора" onClick={()=>{setLoginOpen(true);setMessage('')}}><LogIn size={17}/></button>}</div>
    </header>
    <main>
      {selected ? <section className="detail">
        <button className="back" onClick={()=>setSelected(null)}><ArrowLeft size={16}/> Назад в каталог</button>
        <div className="detail-grid"><div className="detail-photos">{(selected.image_urls||[]).length ? selected.image_urls.map((src,i)=><img key={src+i} src={src} alt={selected.title}/>) : <div className="photo-placeholder large"><Archive size={32}/></div>}</div>
        <div className="detail-copy"><div className="eyebrow">{selected.category} {selected.year && ` / ${selected.year}`}</div><h1>{selected.title}</h1><div className="detail-brand">{selected.brand || 'Бренд не указан'}</div><div className="rule"/><p className="description">{selected.description || 'Описание пока не добавлено.'}</p>{selected.tags && <div className="tags">{selected.tags.split(',').map(t=><span key={t}>#{t.trim()}</span>)}</div>}<div className="item-id">АРХИВНЫЙ НОМЕР · {String(items.findIndex(x=>x.id===selected.id)+1).padStart(3,'0')}</div>{session && <div className="admin-row"><button className="btn secondary" onClick={()=>openEdit(selected)}><Pencil size={15}/> Редактировать</button><button className="icon-btn danger" onClick={()=>deleteItem(selected)}><Trash2 size={16}/></button></div>}</div></div>
      </section> : <>
        <section className="catalog"><div className="catalog-head"><div className="catalog-count">{category} <span>({filtered.length})</span></div>{session && <button className="btn primary" onClick={openNew}><Plus size={16}/> Добавить предмет</button>}</div>
          <div className="filters"><label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по названию, бренду, тегам..."/>{search && <button onClick={()=>setSearch('')}><X size={15}/></button>}</label><div className="category-list">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}<button key={photoCategory} className={'photo-filter '+(category===photoCategory?'active':'')} onClick={()=>setCategory(photoCategory)}>Фото</button></div></div>
          {!supabase && <div className="notice"><strong>Нужно подключить базу данных.</strong><br/>Интерфейс готов. Следуй README.md, чтобы включить постоянное хранение и админ-панель.</div>}
          {message && <div className="notice">{message}</div>}
          {loading ? <div className="empty">Загружаем архив…</div> : filtered.length ? <div className="grid">{filtered.map((item,index)=><button className="item-card" key={item.id} onClick={()=>setSelected(item)}><div className="item-image">{item.image_urls?.[0] ? <img src={item.image_urls[0]} alt={item.title}/> : <div className="photo-placeholder"><ImagePlus size={23}/><span>ФОТО НЕ ДОБАВЛЕНО</span></div>}<span className="card-number">{String(items.indexOf(item)+1).padStart(3,'0')}</span><ArrowUpRight className="card-arrow" size={18}/></div><div className="card-meta"><span>{item.category}</span>{item.year && <span>{item.year}</span>}</div><h3>{item.title}</h3><p>{item.brand || 'Бренд не указан'}</p></button>)}</div> : <div className="empty"><Archive size={26}/><h3>{items.length ? 'Ничего не найдено' : 'Архив пока пуст'}</h3><p>{items.length ? 'Попробуй изменить поиск или категорию.' : session ? 'Добавь первый предмет — он появится здесь.' : 'Новые предметы появятся здесь после публикации.'}</p>{session && !items.length && <button className="btn primary" onClick={openNew}><Plus size={16}/> Добавить первый предмет</button>}</div>}
        </section>
      </>}
    </main>
    <footer><span>БОГЕМА ЛЕНИНГРАД АРХИВ © 2026</span><span>АРХИВ ОДЕЖДЫ</span><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>НАВЕРХ ↑</button></footer>
    {loginOpen && <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setLoginOpen(false)}><form className="dialog narrow" onSubmit={signIn}><button type="button" className="close" onClick={()=>setLoginOpen(false)}><X/></button><div className="eyebrow">ЗАКРЫТЫЙ ДОСТУП</div><h2>Вход в архив.</h2><p className="muted">Только для администратора.</p><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Пароль<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{message && <p className="form-error">{message}</p>}<button className="btn primary full" type="submit">Войти <ArrowUpRight size={16}/></button></form></div>}
    {modal && <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><form className="dialog" onSubmit={saveItem}><button type="button" className="close" onClick={()=>setModal(false)}><X/></button><div className="eyebrow">{editing?'РЕДАКТИРОВАНИЕ':'НОВАЯ ЗАПИСЬ'}</div><h2>{editing?'Изменить предмет':'Добавить предмет.'}</h2><p className="muted">Заполни информацию и загрузи фотографии.</p><div className="form-grid"><label className="span2">Название предмета *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Например, джинсы Prisoner"/></label><label>Бренд<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="Название бренда"/></label><label>Категория<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Год выпуска<input value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="Например, 2004"/></label><label className="span2">Описание<textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Материал, детали, история вещи..."/></label><label className="span2">Теги, через запятую<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="винтаж, деним, архив"/></label><label className="span2 upload"><ImagePlus size={20}/><span><strong>Выбрать фотографии</strong><small>Можно выбрать несколько изображений</small></span><input type="file" accept="image/*" multiple onChange={e=>setPhotos(Array.from(e.target.files||[]))}/></label>{photos.length>0 && <div className="span2 file-count">{photos.length} новых фото: {photos.map(p=>p.name).join(', ')}</div>}{existingPhotos.length>0 && <div className="span2 existing-photos"><span>Уже загружено: {existingPhotos.length}</span><div>{existingPhotos.map(src=><div key={src}><img src={src} alt=""/><button type="button" onClick={()=>setExistingPhotos(existingPhotos.filter(x=>x!==src))}><X size={13}/></button></div>)}</div></div>}</div>{message && <p className="form-error">{message}</p>}<div className="dialog-actions"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Отмена</button><button className="btn primary" type="submit" disabled={saving}>{saving?'Сохраняем…':'Сохранить предмет'}</button></div></form></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
