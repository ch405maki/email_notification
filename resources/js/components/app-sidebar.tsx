import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { 
    dashboard,
    users
} from '@/routes';
import { resolveUrl } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, UserRoundCog, Upload, Send, Mail, PenLine, FileText, IdCard } from 'lucide-react';
import AppLogo from './app-logo';
import { type SharedData } from '@/types';

const allMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'User Management',
        href: users(),
        icon: UserRoundCog,
    },
];

const studentNavItems: NavItem[] = [
    {
        title: 'Send Email',
        href: '/students/upload',
        icon: Send,
    },
    {
        title: 'Manual Email',
        href: '/students/manual-send',
        icon: PenLine,
    },
    {
        title: 'Email Template',
        href: '/students/template',
        icon: FileText,
    },
    {
        title: 'Email Logs',
        href: '/students/logs',
        icon: Mail,
    },
];

const idAppNavItems: NavItem[] = [
    {
        title: 'ID Application',
        href: '/id-application',
        icon: IdCard,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const user = page.props.auth.user;
    const isAdmin = user.role?.slug === 'admin';
    const userModules = user.modules ?? [];

    const hasModule = (slug: string) => isAdmin || userModules.includes(slug);

    const mainNavItems = isAdmin ? allMainNavItems : allMainNavItems.filter(i => i.title !== 'User Management');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />

                {hasModule('email') && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Students</SidebarGroupLabel>
                        <SidebarMenu>
                            {studentNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(resolveUrl(item.href))}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}

                {hasModule('id-application') && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>ID Application</SidebarGroupLabel>
                        <SidebarMenu>
                            {idAppNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(resolveUrl(item.href))}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>

    );
}
