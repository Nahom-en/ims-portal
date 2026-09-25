import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { approveStep, rejectStep, resubmit, submitForApproval } from '@/lib/workflow'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, requestId, actorId, comment, entityType, entityId, departmentId, requestedBy } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    switch (action) {
      case 'APPROVE':
        if (!requestId || !actorId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        await approveStep(supabase, { requestId, actorId, comment })
        return NextResponse.json({ success: true })

      case 'REJECT':
        if (!requestId || !actorId || !comment) return NextResponse.json({ error: 'Missing params including comment' }, { status: 400 })
        await rejectStep(supabase, { requestId, actorId, comment })
        return NextResponse.json({ success: true })

      case 'RESUBMIT':
        if (!requestId || !actorId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        await resubmit(supabase, { requestId, actorId })
        return NextResponse.json({ success: true })

      case 'SUBMIT':
        if (!entityType || !entityId || !departmentId || !requestedBy) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        const req = await submitForApproval(supabase, { entityType, entityId, departmentId, requestedBy })
        return NextResponse.json({ success: true, requestId: req.id })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: Record<string, unknown>) {
    console.error('Workflow API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
