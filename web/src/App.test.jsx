import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EventCard, EventsPage } from './App.jsx'

describe('CampusFest event discovery', () => {
  it('renders event details with a working detail link', () => {
    render(
      <MemoryRouter>
        <EventCard event={{
          _id: 'event-1',
          title: 'Student Hackday',
          category: 'Technology',
          venue: 'Innovation Lab',
          startAt: '2027-01-21T10:00:00.000Z',
          description: 'Build something useful with the people around you.',
        }} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /view student hackday/i })).toHaveAttribute('href', '/events/event-1')
    expect(screen.getByRole('heading', { name: 'Student Hackday' })).toBeInTheDocument()
    expect(screen.getByText('Innovation Lab')).toBeInTheDocument()
    expect(screen.getByText('Free entry')).toBeInTheDocument()
  })

  it('moves to the next server-side results page', async () => {
    const fetchMock = vi.fn(async (request) => {
      const currentPage = Number(new URL(request, 'http://localhost').searchParams.get('page'))
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{
              _id: `event-${currentPage}`,
              title: `Event page ${currentPage}`,
              category: 'Technology',
              venue: 'Campus Hall',
              startAt: '2027-01-21T10:00:00.000Z',
              description: 'A practical workshop for campus students.',
            }],
            pagination: { page: currentPage, pages: 2, total: 2 },
          },
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <MemoryRouter initialEntries={['/events?page=1']}>
        <Routes><Route path="/events" element={<EventsPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Event page 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Event page 2' })).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    vi.unstubAllGlobals()
  })
})
