import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, fireEvent, cleanup } from '@testing-library/react'
import SessionDropdown from '../SessionDropdown'
import type { Session } from '../../lib/api'

const mockSessions: Session[] = [
  {
    id: 'session-1',
    name: 'Test Session 1',
    workDir: '/path/to/project',
    createdAt: '2024-01-15T10:00:00Z',
    messages: [],
  },
  {
    id: 'session-2',
    name: 'Test Session 2',
    workDir: '/path/to/another',
    createdAt: '2024-01-14T09:00:00Z',
    messages: [],
  },
  {
    id: 'session-3',
    name: 'Test Session 3',
    workDir: '/path/to/third',
    createdAt: '2024-01-13T08:00:00Z',
    messages: [],
  },
  {
    id: 'session-4',
    name: 'Test Session 4',
    workDir: '/path/to/fourth',
    createdAt: '2024-01-12T07:00:00Z',
    messages: [],
  },
]

describe('SessionDropdown', () => {
  const defaultProps = {
    sessions: mockSessions,
    activeSession: null,
    onSelect: mock(() => {}),
    onCreateNew: mock(() => {}),
    onViewAll: mock(() => {}),
  }

  beforeEach(() => {
    defaultProps.onSelect.mockClear()
    defaultProps.onCreateNew.mockClear()
    defaultProps.onViewAll.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders without crashing', () => {
    const { getByTitle } = render(<SessionDropdown {...defaultProps} />)
    expect(getByTitle('Sessions')).toBeDefined()
  })

  it('shows "Select Session" when no active session', () => {
    const { getByText } = render(<SessionDropdown {...defaultProps} />)
    expect(getByText('Select Session')).toBeDefined()
  })

  it('shows active session name when provided', () => {
    const { getByText } = render(
      <SessionDropdown
        {...defaultProps}
        activeSession={mockSessions[0]}
      />
    )
    expect(getByText('Test Session 1')).toBeDefined()
  })

  it('opens dropdown when button is clicked', () => {
    const { getByTitle, getByText } = render(<SessionDropdown {...defaultProps} />)
    const button = getByTitle('Sessions')
    fireEvent.click(button)
    expect(getByText('Recent Sessions')).toBeDefined()
  })

  it('shows only first 3 sessions in dropdown', () => {
    const { getByTitle, getByText, queryByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))

    expect(getByText('Test Session 1')).toBeDefined()
    expect(getByText('Test Session 2')).toBeDefined()
    expect(getByText('Test Session 3')).toBeDefined()
    expect(queryByText('Test Session 4')).toBeNull()
  })

  it('calls onSelect when a session is clicked', () => {
    const { getByTitle, getByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))
    fireEvent.click(getByText('Test Session 1'))

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1)
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockSessions[0])
  })

  it('calls onCreateNew when New Session is clicked', () => {
    const { getByTitle, getByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))
    fireEvent.click(getByText('New Session'))

    expect(defaultProps.onCreateNew).toHaveBeenCalledTimes(1)
  })

  it('calls onViewAll when View All Sessions is clicked', () => {
    const { getByTitle, getByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))
    fireEvent.click(getByText('View All Sessions'))

    expect(defaultProps.onViewAll).toHaveBeenCalledTimes(1)
  })

  it('shows "No sessions yet" when sessions array is empty', () => {
    const { getByTitle, getByText } = render(
      <SessionDropdown
        {...defaultProps}
        sessions={[]}
      />
    )
    fireEvent.click(getByTitle('Sessions'))
    expect(getByText('No sessions yet')).toBeDefined()
  })

  it('shows count of additional sessions', () => {
    const { getByTitle, getByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))
    expect(getByText('+1 more')).toBeDefined()
  })

  it('highlights active session in the list', () => {
    const { getByTitle, container } = render(
      <SessionDropdown
        {...defaultProps}
        activeSession={mockSessions[0]}
      />
    )
    fireEvent.click(getByTitle('Sessions'))

    const allButtons = container.querySelectorAll('button')
    const activeSessionButton = Array.from(allButtons).find(btn =>
      btn.textContent?.includes('Test Session 1') &&
      btn.className.includes('bg-blue-600/20')
    )
    expect(activeSessionButton).toBeDefined()
    expect(activeSessionButton).not.toBeNull()
  })

  it('closes dropdown after selecting a session', () => {
    const { getByTitle, getByText, queryByText } = render(<SessionDropdown {...defaultProps} />)
    fireEvent.click(getByTitle('Sessions'))
    expect(getByText('Recent Sessions')).toBeDefined()

    fireEvent.click(getByText('Test Session 1'))
    expect(queryByText('Recent Sessions')).toBeNull()
  })
})
