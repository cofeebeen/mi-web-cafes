'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
    padding: '48px 24px',
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 999,
    background: '#22d3ee1a',
    color: '#67e8f9',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  link: {
    color: '#67e8f9',
    textDecoration: 'none',
    fontWeight: 600,
  },
}

export default function CafesPage() {
  const [cafes, setCafes] = useState([])
  const [categories, setCategories] = useState([])
  const [cafeCategories, setCafeCategories] = useState({})
  const [categoryScores, setCategoryScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    band: '',
    city: '',
    categoryId: '',
    sort: 'desc',
  })

  useEffect(() => {
    fetchCafes()
  }, [])

  async function fetchCafes() {
    setLoading(true)
    setError('')

    const [{ data, error }, { data: cats, error: catErr }, { data: reviewCats, error: reviewErr }] =
      await Promise.all([
        supabase
          .from('cafe_scores')
          .select('*')
          .order('score', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('reviews').select('cafe_id, category_id, score'),
      ])

    if (error || catErr || reviewErr) {
      console.error(error || catErr || reviewErr)
      setError('No se pudieron cargar los cafes.')
      setLoading(false)
      return
    }

    const grouped = reviewCats?.reduce((acc, row) => {
      acc[row.cafe_id] = acc[row.cafe_id] || new Set()
      acc[row.cafe_id].add(row.category_id)
      return acc
    }, {}) || {}

    const catScores = reviewCats?.reduce((acc, row) => {
      const cafeId = row.cafe_id
      const categoryId = row.category_id
      const score = Number(row.score ?? 0)
      if (Number.isNaN(score)) return acc
      if (!acc[cafeId]) acc[cafeId] = {}
      if (!acc[cafeId][categoryId]) acc[cafeId][categoryId] = { sum: 0, count: 0 }
      acc[cafeId][categoryId].sum += score
      acc[cafeId][categoryId].count += 1
      return acc
    }, {}) || {}

    const catAverages = Object.fromEntries(
      Object.entries(catScores).map(([cafeId, categoriesObj]) => [
        cafeId,
        Object.fromEntries(
          Object.entries(categoriesObj).map(([catId, { sum, count }]) => [
            catId,
            Number((sum / count).toFixed(2)),
          ]),
        ),
      ]),
    )

    const groupedObj = Object.fromEntries(
      Object.entries(grouped).map(([k, v]) => [k, Array.from(v)]),
    )

    setCategories(cats || [])
    setCafeCategories(groupedObj)
    setCategoryScores(catAverages)
    setCafes(data || [])
    setLoading(false)
  }

  const filteredCafes = cafes.filter(cafe => {
    const score = Number(cafe.score ?? 0)
    const meetsBand =
      filters.band === ''
        ? true
        : filters.band === 'excelente'
        ? score >= 8.35
        : filters.band === 'volver'
        ? score >= 7.75 && score < 8.35
        : filters.band === 'recomendable'
        ? score >= 7.25 && score < 7.75
        : filters.band === 'ahorratelo'
        ? score < 7.25
        : true
    const meetsCity = filters.city ? cafe.city === filters.city : true
    const meetsCategory = filters.categoryId
      ? (cafeCategories[cafe.id] || []).includes(filters.categoryId)
      : true
    return meetsBand && meetsCity && meetsCategory
  })

  const sortedCafes = [...filteredCafes].sort((a, b) => {
    const aScore = filters.categoryId
      ? Number(categoryScores?.[a.id]?.[filters.categoryId] ?? -Infinity)
      : Number(a.score ?? 0)
    const bScore = filters.categoryId
      ? Number(categoryScores?.[b.id]?.[filters.categoryId] ?? -Infinity)
      : Number(b.score ?? 0)
    return filters.sort === 'asc' ? aScore - bScore : bScore - aScore
  })

  const cityOptions = Array.from(new Set(cafes.map(c => c.city))).filter(Boolean)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={{ opacity: 0.7, fontSize: 14, letterSpacing: 0.5 }}>
              Guia rapida de cafes
            </p>
            <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
              Cafeterias destacadas
            </h1>
          </div>
          <Link style={styles.link} href="/login">
            Gestionar lista &rarr;
          </Link>
        </div>

        {loading && <p>Cargando cafes...</p>}
        {!loading && error && <p>{error}</p>}

        {!loading && !error && (
          <div style={{ ...styles.card, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 13 }}>Nota global</span>
                <select
                  style={styles.input}
                  value={filters.band}
                  onChange={e => setFilters(prev => ({ ...prev, band: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="excelente">Excelente (≥ 8.35)</option>
                  <option value="volver">Volvería (7.75 - 8.35)</option>
                  <option value="recomendable">Recomendable (7.25 - 7.75)</option>
                  <option value="ahorratelo">Ahórratelo (&lt; 7.25)</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 13 }}>Ubicacion</span>
                <select
                  style={styles.input}
                  value={filters.city}
                  onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                >
                  <option value="">Todas</option>
                  {cityOptions.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 13 }}>Categoria</span>
                <select
                  style={styles.input}
                  value={filters.categoryId}
                  onChange={e => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 13 }}>Orden por nota</span>
                <select
                  style={styles.input}
                  value={filters.sort}
                  onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                >
                  <option value="desc">De mayor a menor</option>
                  <option value="asc">De menor a mayor</option>
                </select>
              </label>
            </div>
            <button
              style={{ ...styles.ghost, width: 'fit-content' }}
              onClick={() => setFilters({ band: '', city: '', categoryId: '', sort: 'desc' })}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && !error && (
          <div style={styles.grid}>
            {sortedCafes.map(cafe => (
              <article key={cafe.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 20, marginBottom: 8 }}>{cafe.name}</h2>
                  <span style={styles.badge}>Score: {cafe.score}</span>
                </div>
                <p style={{ color: '#cbd5e1', marginBottom: 4 }}>{cafe.city}</p>
                {filters.categoryId && (
                  <p style={{ marginTop: 8 }}>
                    <span style={styles.badge}>
                      {(() => {
                        const score = categoryScores?.[cafe.id]?.[filters.categoryId]
                        return score !== undefined
                          ? `Nota categoria: ${score}`
                          : 'Sin nota en categoria'
                      })()}
                    </span>
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
