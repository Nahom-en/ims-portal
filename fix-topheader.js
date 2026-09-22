const fs = require('fs');
let code = fs.readFileSync('src/components/layout/TopHeader.tsx', 'utf8');

// 1. Real-time subscription
const subReplace = `fetchNotifs()

    let channel: any
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('employees').select('id').eq('auth_user_id', user.id).single().then(({ data: emp }) => {
        if (!emp) return
        channel = supabase.channel('notifs-' + emp.id)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + emp.id },
            (payload) => {
              const n = payload.new
              setNotifications(prev => [{
                id: n.id,
                title: n.title,
                description: n.message,
                time: new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                read: n.is_read
              }, ...prev].slice(0, 10))
            }
          )
          .subscribe()
      })
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])`;

code = code.replace(/fetchNotifs\(\)\n  \}, \[supabase\]\)/, subReplace);


// 2. Add Breadcrumb UUID lookup
const breadcrumbState = `
  const [uuidNames, setUuidNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchNames = async () => {
      const segments = pathname.split('/').filter(Boolean)
      const newNames: Record<string, string> = { ...uuidNames }
      let updated = false

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          if (!newNames[segment]) {
            const prev = segments[i - 1]
            if (prev === 'objectives') {
              const { data } = await supabase.from('objective_definitions').select('objective_description').eq('id', segment).single()
              if (data) { newNames[segment] = data.objective_description; updated = true; }
            } else if (prev === 'kpis') {
              const { data } = await supabase.from('kpi_definitions').select('name').eq('id', segment).single()
              if (data) { newNames[segment] = data.name; updated = true; }
            } else if (prev === 'risks') {
              const { data } = await supabase.from('risk_definitions').select('name').eq('id', segment).single()
              if (data) { newNames[segment] = data.name; updated = true; }
            } else if (prev === 'users') {
              const { data } = await supabase.from('employees').select('first_name, last_name').eq('id', segment).single()
              if (data) { newNames[segment] = data.first_name + ' ' + data.last_name; updated = true; }
            } else if (prev === 'departments') {
              const { data } = await supabase.from('departments').select('department_name').eq('id', segment).single()
              if (data) { newNames[segment] = data.department_name; updated = true; }
            }
          }
        }
      }
      if (updated) setUuidNames(newNames)
    }
    fetchNames()
  }, [pathname, supabase])
  
  const unreadCount`;

code = code.replace(/const unreadCount/, breadcrumbState);

const breadcrumbLabel = `      // Format the label nicely
      let label = segment.charAt(0).toUpperCase() + segment.slice(1)
      if (segment.toLowerCase() === 'kpis') label = 'KPI Tracking'
      if (segment.toLowerCase() === 'risks') label = 'Risk Register'

      if (uuidNames[segment]) {
        label = uuidNames[segment]
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        label = "Loading..."
      }`;

code = code.replace(/\/\/ Format the label nicely[\s\S]*?if \(segment\.toLowerCase\(\) === 'risks'\) label = 'Risk Register'/, breadcrumbLabel);

fs.writeFileSync('src/components/layout/TopHeader.tsx', code);
