'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CafesPage() {
  const [cafes, setCafes] = useState([])

  useEffect(() => {
    async function fetchCafes() {
      const { data, error } = await supabase
     .from('cafe_scores')
     .select('*')
     .order('score', { ascending: false })


      if (error) {
        console.error(error)
      } else {
        setCafes(data)
      }
    }

    fetchCafes()
  }, [])

  return (
    <main>
      <h1>Cafeterías</h1>

      {cafes.map(cafe => (
        <div key={cafe.id}>
          <h2>{cafe.name}</h2>
          <p>{cafe.city}</p>
          <p>⭐ {cafe.score}</p>
          <hr />
        </div>
      ))}
    </main>
  )
}
