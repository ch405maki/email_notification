import AppHeaderLayoutTemplate from '@/layouts/app/app-header-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface PublicLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: PublicLayoutProps) => (
    <AppHeaderLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
    </AppHeaderLayoutTemplate>
);
