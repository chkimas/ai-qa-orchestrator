import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      run_id,
      message,
      status,
      details,
      role,
      action,
      step_id,
      selector,
      value,
      screenshot_url,
    } = body

    const supabase = getSupabaseAdmin()

    const logEntry = {
      run_id,
      message: message || 'No message provided',
      status: status || 'INFO',
      details: typeof details === 'object' ? JSON.stringify(details) : details || '',
      role: role || 'assistant',
      action: action || 'log',
      step_id: typeof step_id === 'number' ? step_id : Math.floor(Date.now() / 1000),
      selector: selector || null,
      value: value || null,
      screenshot_url: screenshot_url || null,
    }

    const { error: logError } = await supabase.from('execution_logs').insert(logEntry)

    if (logError) {
      console.error('Telemetry Log Error:', logError.message)
      return Response.json({ error: logError.message }, { status: 500 })
    }

    if (status === 'COMPLETED' || status === 'FAILED') {
      await supabase.from('test_runs').update({ status }).eq('id', run_id)
    }

    return new Response('Telemetry Received', { status: 200 })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown telemetry error'
    console.error('Telemetry Crash:', errorMessage)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
