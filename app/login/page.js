'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b1224',
    color: '#e2e8f0',
    padding: '48px 24px',
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
  },
  container: {
    maxWidth: 1040,
    margin: '0 auto',
    display: 'grid',
    gap: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  panel: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  },
  label: { display: 'block', fontSize: 13, opacity: 0.8, marginBottom: 6 },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e2e8f0',
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#22d3ee1a',
    color: '#67e8f9',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  ghost: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 500,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  link: {
    color: '#67e8f9',
    textDecoration: 'none',
    fontWeight: 600,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    background: '#22d3ee1a',
    color: '#67e8f9',
    fontSize: 13,
  },
}

export default function LoginPage() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [cafes, setCafes] = useState([])
  const [evaluators, setEvaluators] = useState([])
  const [categories, setCategories] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    cafeId: '',
    cafeName: '',
    cafeCity: '',
    scoresByEvaluator: {},
  })
  const [editingCafeId, setEditingCafeId] = useState(null)
  const [crudError, setCrudError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      },
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchLookups()
      fetchReviews()
    } else {
      setCafes([])
      setEvaluators([])
      setCategories([])
      setReviews([])
    }
  }, [session])

  async function fetchLookups() {
    setLoading(true)
    setCrudError('')

    const [
      { data: cafesData, error: cafesError },
      { data: evalsData, error: evalsError },
      { data: catsData, error: catsError },
    ] = await Promise.all([
      supabase.from('cafes').select('*').order('name'),
      supabase.from('evaluators').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])

    if (cafesError || evalsError || catsError) {
      console.error(cafesError || evalsError || catsError)
      setCrudError('No se pudieron cargar los datos.')
    } else {
      setCafes(cafesData || [])
      setEvaluators(evalsData || [])
      setCategories(catsData || [])
    }

    setLoading(false)
  }

  async function fetchReviews() {
    setLoading(true)
    setCrudError('')

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        score,
        cafe_id,
        evaluator_id,
        category_id,
        created_at,
        cafe:cafes ( id, name, city ),
        evaluator:evaluators ( id, name ),
        category:categories ( id, name, weight )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setCrudError('No se pudieron cargar los cafes.')
    } else {
      setReviews(data || [])
    }

    setLoading(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      setAuthError('No se pudo iniciar sesion.')
    }

    setAuthLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setEmail('')
    setPassword('')
    setForm({
      cafeId: '',
      cafeName: '',
      cafeCity: '',
      scoresByEvaluator: {},
    })
    setEditingCafeId(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setCrudError('')
    setLoading(true)

    const payload = {
      cafeName: form.cafeName.trim(),
      cafeCity: form.cafeCity.trim(),
      scoresByEvaluator: form.scoresByEvaluator,
    }

    if (!payload.cafeName || !payload.cafeCity) {
      setCrudError('Completa nombre y ciudad.')
      setLoading(false)
      return
    }

    const requiredEvaluatorNames = ['I', 'F']
    const requiredEvaluators = requiredEvaluatorNames.map(name =>
      evaluators.find(ev => ev.name === name),
    )

    if (requiredEvaluators.some(ev => !ev)) {
      setCrudError('Faltan evaluadores requeridos (I y F) en la base de datos.')
      setLoading(false)
      return
    }

    try {
      // Crear o usar la cafeteria
      let cafeId = editingCafeId
      if (!cafeId) {
        const { data, error } = await supabase
          .from('cafes')
          .insert({ name: payload.cafeName, city: payload.cafeCity })
          .select('id')
          .single()
        if (error) {
          throw new Error(
            error.message || error.details || 'Error al crear la cafeteria',
          )
        }
        cafeId = data.id
      } else {
        const { error } = await supabase
          .from('cafes')
          .update({ name: payload.cafeName, city: payload.cafeCity })
          .eq('id', cafeId)
        if (error) {
          throw new Error(error.message || error.details || 'Error al actualizar la cafeteria')
        }
      }

      // Upsert de reviews por categoria
      const rows = categories.flatMap(cat => {
        return requiredEvaluators.map(ev => {
          const raw = payload.scoresByEvaluator?.[ev.id]?.[cat.id] ?? ''
          const parsed =
            raw === '' || raw === null || raw === undefined ? NaN : Number(raw)
          return {
            cafe_id: cafeId,
            evaluator_id: ev.id,
            category_id: cat.id,
            score: parsed,
            evaluator_name: ev.name,
            category_name: cat.name,
          }
        })
      })

      // Validar que todas las categorias tengan nota de I y F
      for (const row of rows) {
        if (Number.isNaN(row.score)) {
          throw new Error(
            `Falta puntuacion de ${row.evaluator_name} en categoria ${row.category_name}`,
          )
        }
      }

      const sanitizedRows = rows.map(({ evaluator_name, category_name, ...rest }) => rest)

      const { error: reviewsError } = await supabase
        .from('reviews')
        .upsert(sanitizedRows, { onConflict: 'cafe_id,evaluator_id,category_id' })

      if (reviewsError) {
        throw new Error(reviewsError.message || reviewsError.details || 'Error al guardar reviews')
      }

      setForm({
        cafeId: '',
        cafeName: '',
        cafeCity: '',
        scoresByEvaluator: {},
      })
      setEditingCafeId(null)
      await fetchLookups()
      await fetchReviews()
    } catch (err) {
      const message =
        err?.message ||
        err?.toString?.() ||
        (typeof err === 'object' ? JSON.stringify(err) : String(err))
      console.error('Error al guardar', err)
      setCrudError('No se pudo guardar. ' + message)
    }

    setLoading(false)
  }

  function handleEdit(reviewGroup) {
    setForm({
      cafeId: reviewGroup.cafe.id,
      cafeName: reviewGroup.cafe.name || '',
      cafeCity: reviewGroup.cafe.city || '',
      scoresByEvaluator: reviewGroup.scoresByEvaluator || {},
    })
    setEditingCafeId(reviewGroup.cafe.id)
  }

  async function handleDelete(id) {
    setCrudError('')
    setLoading(true)

    const { error } = await supabase.from('reviews').delete().eq('id', id)

    if (error) {
      console.error(error)
      setCrudError('No se pudo eliminar la review.')
    } else {
      await fetchReviews()
    }

    setLoading(false)
  }

  async function handleDeleteCafe(cafeId) {
    setCrudError('')
    setLoading(true)
    try {
      const { error: reviewsError } = await supabase
        .from('reviews')
        .delete()
        .eq('cafe_id', cafeId)
      if (reviewsError) throw reviewsError
      const { error: cafeError } = await supabase.from('cafes').delete().eq('id', cafeId)
      if (cafeError) throw cafeError
      await fetchLookups()
      await fetchReviews()
    } catch (err) {
      console.error(err)
      setCrudError('No se pudo eliminar la cafeteria.')
    }
    setLoading(false)
  }

  const groupedByCafe = Object.values(
    reviews.reduce((acc, review) => {
      const cafeId = review.cafe_id
      if (!acc[cafeId]) {
        acc[cafeId] = {
          cafe: review.cafe || { id: cafeId, name: 'Cafe', city: '' },
          scoresByEvaluator: {},
        }
      }
      const evalScores = acc[cafeId].scoresByEvaluator
      if (!evalScores[review.evaluator_id]) {
        evalScores[review.evaluator_id] = {}
      }
      evalScores[review.evaluator_id][review.category_id] = review.score
      return acc
    }, {}),
  )

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={{ opacity: 0.7, fontSize: 14, letterSpacing: 0.5 }}>
              Gestion de cafes
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
              Login y panel de control
            </h1>
          </div>
          <Link href="/" style={styles.link}>
            Volver al home
          </Link>
        </div>

        {!session && (
          <section style={styles.panel}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Iniciar sesion</h2>
            <form onSubmit={handleSignIn}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />

              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                required
              />

              {authError && (
                <p style={{ color: '#fca5a5', marginBottom: 8 }}>{authError}</p>
              )}

              <button style={styles.button} type="submit" disabled={authLoading}>
                {authLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </section>
        )}

        {session && (
          <>
            <section
              style={{
                ...styles.panel,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p style={{ opacity: 0.8, fontSize: 14 }}>
                  Sesion activa como {session.user?.email}
                </p>
              </div>
              <button style={styles.ghost} onClick={handleSignOut}>
                Cerrar sesion
              </button>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>
                {editingCafeId ? 'Editar reviews de la cafeteria' : 'Agregar cafeteria y reviews'}
              </h2>
              <form onSubmit={handleSave}>
                <label style={styles.label}>Nombre de la cafeteria</label>
                <input
                  style={styles.input}
                  value={form.cafeName}
                  onChange={e => setForm(prev => ({ ...prev, cafeName: e.target.value }))}
                  placeholder="Cafe Central"
                />

                <label style={styles.label}>Ciudad</label>
                <input
                  style={styles.input}
                  value={form.cafeCity}
                  onChange={e => setForm(prev => ({ ...prev, cafeCity: e.target.value }))}
                  placeholder="Madrid"
                />

                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{cat.name}</strong>
                        <span style={{ opacity: 0.7 }}>Peso {cat.weight}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                        {['I', 'F'].map(name => {
                          const evaluator = evaluators.find(ev => ev.name === name)
                          const evalId = evaluator?.id
                          const value =
                            (evalId && form.scoresByEvaluator?.[evalId]?.[cat.id]) || ''
                          return (
                            <div
                              key={name}
                              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                              <span style={{ minWidth: 20 }}>{name}</span>
                              <input
                                style={styles.input}
                                type="number"
                                step="0.1"
                                value={value}
                                onChange={e =>
                                  evalId
                                    ? setForm(prev => ({
                                        ...prev,
                                        scoresByEvaluator: {
                                          ...prev.scoresByEvaluator,
                                          [evalId]: {
                                            ...(prev.scoresByEvaluator?.[evalId] || {}),
                                            [cat.id]: e.target.value,
                                          },
                                        },
                                      }))
                                    : setCrudError('Falta evaluador ' + name)
                                }
                                placeholder="8.5"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {crudError && (
                  <p style={{ color: '#fca5a5', marginBottom: 8 }}>{crudError}</p>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button style={styles.button} type="submit" disabled={loading}>
                    {loading
                      ? 'Guardando...'
                      : editingCafeId
                      ? 'Actualizar'
                      : 'Agregar cafeteria + reviews'}
                  </button>
                  {editingCafeId && (
                    <button
                      type="button"
                      style={styles.ghost}
                      onClick={() => {
                        setEditingCafeId(null)
                        setForm({
                          cafeId: '',
                          cafeName: '',
                          cafeCity: '',
                          evaluatorId: '',
                          scoresByCategory: {},
                        })
                        setCrudError('')
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section style={styles.panel}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 12,
                }}
              >
                <h2 style={{ fontSize: 20 }}>Reviews</h2>
                <button
                  style={{ ...styles.ghost, padding: '8px 12px' }}
                  onClick={() => {
                    fetchLookups()
                    fetchReviews()
                  }}
                  disabled={loading}
                >
                  Refrescar
                </button>
              </div>
              {loading && <p>Cargando...</p>}
              {!loading && crudError && (
                <p style={{ color: '#fca5a5', marginBottom: 8 }}>{crudError}</p>
              )}
              {!loading && !crudError && (
                <div style={styles.grid}>
                  {groupedByCafe.map(group => (
                    <article key={group.cafe.id} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: 18 }}>{group.cafe.name}</h3>
                          <p style={{ color: '#cbd5e1' }}>{group.cafe.city}</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                        {categories.map(cat => (
                          <div
                            key={cat.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <span>{cat.name}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {['I', 'F'].map(name => {
                                const evaluator = evaluators.find(ev => ev.name === name)
                                const evalId = evaluator?.id
                                const score =
                                  (evalId && group.scoresByEvaluator?.[evalId]?.[cat.id]) ?? null
                                return (
                                  <span key={name} style={styles.badge}>
                                    {name}: {score ?? 'Sin nota'}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginTop: 12,
                        }}
                      >
                        <button
                          style={{ ...styles.button, padding: '8px 12px' }}
                          type="button"
                          onClick={() => handleEdit(group)}
                        >
                          Editar
                        </button>
                        <button
                          style={{ ...styles.ghost, padding: '8px 12px' }}
                          type="button"
                          onClick={() => handleDeleteCafe(group.cafe.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                  {groupedByCafe.length === 0 && (
                    <p style={{ opacity: 0.8 }}>No hay reviews cargadas.</p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
