-- 1. Bảng Luồng Chat (Threads)
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng Tin nhắn (Messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Kích hoạt Realtime cho bảng chat_messages
-- Kiểm tra xem đã tồn tại trong publication chưa (thường dùng supabase_realtime)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;

-- 4. Chính sách Bảo mật (RLS)
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Thread access
DROP POLICY IF EXISTS "Users can view their own threads" ON public.chat_threads;
CREATE POLICY "Users can view their own threads" ON public.chat_threads
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "Users can create their own threads" ON public.chat_threads;
CREATE POLICY "Users can create their own threads" ON public.chat_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Message access
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.chat_messages;
CREATE POLICY "Users can view messages in their threads" ON public.chat_messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_threads 
        WHERE id = thread_id AND (user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    ));

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Mark as read access (Update)
DROP POLICY IF EXISTS "Admin or Receiver can mark messages as read" ON public.chat_messages;
CREATE POLICY "Admin or Receiver can mark messages as read" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ) OR (
            sender_id != auth.uid() AND EXISTS (
                SELECT 1 FROM public.chat_threads WHERE id = thread_id AND user_id = auth.uid()
            )
        )
    );
