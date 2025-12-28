'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Calendar } from '@/components/ui/calendar';

export default function DesignSystemPage() {
    const [switchChecked, setSwitchChecked] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [buttonGroupValue, setButtonGroupValue] = useState('daily');

    return (
        <div className="min-h-screen bg-[var(--color-background-primary)] p-8 space-y-12">
            {/* Header */}
            <div className="space-y-4">
                <h1 className="heading-1">새로핌찬양대 디자인 시스템</h1>
                <p className="body-large text-[var(--color-text-secondary)]">
                    New Blossom Grace 테마를 기반으로 한 컴포넌트 라이브러리
                </p>
            </div>

            {/* Typography */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    타이포그래피
                </h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="heading-1">Heading 1</h1>
                        <p className="caption">heading-1 / 36px / Bold / Tight line-height</p>
                    </div>
                    <div className="space-y-2">
                        <h2 className="heading-2">Heading 2</h2>
                        <p className="caption">heading-2 / 30px / Bold / Tight line-height</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="heading-3">Heading 3</h3>
                        <p className="caption">heading-3 / 24px / Semibold / Snug line-height</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="heading-4">Heading 4</h4>
                        <p className="caption">heading-4 / 20px / Semibold / Snug line-height</p>
                    </div>
                    <div className="space-y-2">
                        <p className="body-large">Body Large - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</p>
                        <p className="caption">body-large / 18px / Normal / Relaxed line-height</p>
                    </div>
                    <div className="space-y-2">
                        <p className="body-base">Body Base - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</p>
                        <p className="caption">body-base / 16px / Normal / Normal line-height</p>
                    </div>
                    <div className="space-y-2">
                        <p className="body-small">Body Small - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</p>
                        <p className="caption">body-small / 14px / Normal / Normal line-height</p>
                    </div>
                    <div className="space-y-2">
                        <p className="label">Label - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</p>
                        <p className="caption">label / 14px / Medium / Normal line-height</p>
                    </div>
                    <div className="space-y-2">
                        <p className="caption">Caption - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</p>
                        <p className="caption">caption / 12px / Normal / Normal line-height</p>
                    </div>
                </div>
            </section>

            {/* Colors */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    색상 팔레트
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    {/* Primary Colors */}
                    <div className="space-y-3">
                        <h3 className="heading-4">Primary (Heavenly Blue)</h3>
                        <div className="space-y-2">
                            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                                <div key={shade} className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg"
                                        style={{
                                            backgroundColor: `var(--color-primary-${shade})`,
                                            boxShadow: 'var(--shadow-xs)',
                                        }}
                                    />
                                    <span className="caption">{shade}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Accent Colors */}
                    <div className="space-y-3">
                        <h3 className="heading-4">Accent (Grace Blossom)</h3>
                        <div className="space-y-2">
                            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                                <div key={shade} className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg"
                                        style={{
                                            backgroundColor: `var(--color-accent-${shade})`,
                                            boxShadow: 'var(--shadow-xs)',
                                        }}
                                    />
                                    <span className="caption">{shade}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Success Colors */}
                    <div className="space-y-3">
                        <h3 className="heading-4">Success (Hope Green)</h3>
                        <div className="space-y-2">
                            {[50, 100, 200, 300, 400, 500, 600, 700].map((shade) => (
                                <div key={shade} className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg"
                                        style={{
                                            backgroundColor: `var(--color-success-${shade})`,
                                            boxShadow: 'var(--shadow-xs)',
                                        }}
                                    />
                                    <span className="caption">{shade}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Warning Colors */}
                    <div className="space-y-3">
                        <h3 className="heading-4">Warning (Cheerful Yellow)</h3>
                        <div className="space-y-2">
                            {[50, 100, 200, 300, 400, 500, 600].map((shade) => (
                                <div key={shade} className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg"
                                        style={{
                                            backgroundColor: `var(--color-warning-${shade})`,
                                            boxShadow: 'var(--shadow-xs)',
                                        }}
                                    />
                                    <span className="caption">{shade}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Colors */}
                    <div className="space-y-3">
                        <h3 className="heading-4">Error (Faithful Red)</h3>
                        <div className="space-y-2">
                            {[50, 100, 200, 300, 400, 500, 600, 700].map((shade) => (
                                <div key={shade} className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg"
                                        style={{
                                            backgroundColor: `var(--color-error-${shade})`,
                                            boxShadow: 'var(--shadow-xs)',
                                        }}
                                    />
                                    <span className="caption">{shade}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Buttons */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    버튼
                </h2>
                <div className="space-y-8">
                    <div>
                        <h3 className="heading-4 mb-4">기본 Variants</h3>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="default">Primary Button</Button>
                            <Button variant="secondary">Secondary Button</Button>
                            <Button variant="outline">Outline Button</Button>
                            <Button variant="ghost">Ghost Button</Button>
                            <Button variant="destructive">Destructive Button</Button>
                            <Button variant="link">Link Button</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="heading-4 mb-4">색상 팔레트 Variants (Bold)</h3>
                        <p className="body-small text-[var(--color-text-secondary)] mb-3">
                            디자인 시스템의 주요 색상을 활용한 강조 버튼
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="success">Success</Button>
                            <Button variant="warning">Warning</Button>
                            <Button variant="accent">Accent</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="heading-4 mb-4">색상 팔레트 Variants (Subtle)</h3>
                        <p className="body-small text-[var(--color-text-secondary)] mb-3">
                            부드러운 배경색을 활용한 서브 액션 버튼
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="primarySubtle">Primary Subtle</Button>
                            <Button variant="successSubtle">Success Subtle</Button>
                            <Button variant="warningSubtle">Warning Subtle</Button>
                            <Button variant="errorSubtle">Error Subtle</Button>
                            <Button variant="accentSubtle">Accent Subtle</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="heading-4 mb-4">Sizes</h3>
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="heading-4 mb-4">실제 사용 예제</h3>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-3">
                                <Button variant="success" size="sm">출석 확인</Button>
                                <Button variant="warning" size="sm">일시정지</Button>
                                <Button variant="errorSubtle" size="sm">결석 처리</Button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="accent">특송 배정</Button>
                                <Button variant="primarySubtle">자세히 보기</Button>
                                <Button variant="outline">취소</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Button Group */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    버튼 그룹
                </h2>
                <div className="space-y-8">
                    <div>
                        <h3 className="heading-4 mb-4">기본 사용</h3>
                        <div className="flex flex-col gap-4">
                            <ButtonGroup
                                items={[
                                    { label: '일간', value: 'daily' },
                                    { label: '주간', value: 'weekly' },
                                    { label: '월간', value: 'monthly' },
                                ]}
                                value={buttonGroupValue}
                                onChange={setButtonGroupValue}
                            />
                            <p className="body-small text-[var(--color-text-secondary)]">
                                선택된 값: {buttonGroupValue}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="heading-4 mb-4">Sizes</h3>
                        <div className="flex flex-col gap-4 items-start">
                            <ButtonGroup
                                size="sm"
                                items={[
                                    { label: 'Small', value: 'sm' },
                                    { label: 'Medium', value: 'md' },
                                    { label: 'Large', value: 'lg' },
                                ]}
                                value="sm"
                                onChange={() => { }}
                            />
                            <ButtonGroup
                                size="default"
                                items={[
                                    { label: 'Small', value: 'sm' },
                                    { label: 'Medium', value: 'md' },
                                    { label: 'Large', value: 'lg' },
                                ]}
                                value="md"
                                onChange={() => { }}
                            />
                            <ButtonGroup
                                size="lg"
                                items={[
                                    { label: 'Small', value: 'sm' },
                                    { label: 'Medium', value: 'md' },
                                    { label: 'Large', value: 'lg' },
                                ]}
                                value="lg"
                                onChange={() => { }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Badges */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    배지
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Badge variant="success">출석</Badge>
                    <Badge variant="warning">지각</Badge>
                    <Badge variant="error">결석</Badge>
                    <Badge variant="info">보류</Badge>
                    <Badge variant="accent">특송</Badge>
                    <Badge variant="default">기본</Badge>
                </div>
            </section>

            {/* Form Components */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    폼 컴포넌트
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input id="name" placeholder="홍길동" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input id="email" type="email" placeholder="example@church.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="switch">토글 스위치</Label>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={switchChecked}
                                onCheckedChange={setSwitchChecked}
                            />
                            <span className="body-small">{switchChecked ? '활성화' : '비활성화'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>파트 선택 (Select)</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="파트를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="soprano">소프라노</SelectItem>
                                <SelectItem value="alto">알토</SelectItem>
                                <SelectItem value="tenor">테너</SelectItem>
                                <SelectItem value="bass">베이스</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">자기소개 (Textarea)</Label>
                        <Textarea id="bio" placeholder="간단한 자기소개를 입력하세요." />
                    </div>
                </div>
            </section>

            {/* Switch Variants */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    스위치 (Switch)
                </h2>
                <div className="space-y-8">
                    <div>
                        <h3 className="heading-4 mb-4">Variants</h3>
                        <div className="flex flex-wrap gap-8">
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} />
                                <span className="caption">Default</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="secondary" />
                                <span className="caption">Secondary</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="accent" />
                                <span className="caption">Accent</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="success" />
                                <span className="caption">Success</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="warning" />
                                <span className="caption">Warning</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="error" />
                                <span className="caption">Error</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="heading-4 mb-4">States</h3>
                        <div className="flex flex-wrap gap-8">
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={false} />
                                <span className="caption">Off</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} />
                                <span className="caption">On</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={false} disabled />
                                <span className="caption">Disabled Off</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} disabled />
                                <span className="caption">Disabled On</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cards */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    카드
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>카드 제목</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="body-base">카드 내용이 여기에 표시됩니다. 찬양대원 정보나 출석 현황 등을 보여줄 수 있습니다.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>통계 카드</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="body-small">출석률</span>
                                    <span className="label text-[var(--color-success-600)]">95%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="body-small">총 대원</span>
                                    <span className="label">42명</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>액션 카드</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="body-small">버튼과 함께 사용할 수 있는 카드입니다.</p>
                            <Button size="sm" className="w-full">자세히 보기</Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Tabs */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    탭
                </h2>
                <Tabs value="tab1" className="max-w-2xl">
                    <TabsList className="w-full">
                        <TabsTrigger value="tab1" className="flex-1">탭 1</TabsTrigger>
                        <TabsTrigger value="tab2" className="flex-1">탭 2</TabsTrigger>
                        <TabsTrigger value="tab3" className="flex-1">탭 3</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="body-base">첫 번째 탭의 내용입니다.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="tab2" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="body-base">두 번째 탭의 내용입니다.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="tab3" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="body-base">세 번째 탭의 내용입니다.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </section>

            {/* Feedback Components */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    피드백 컴포넌트
                </h2>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="heading-4">Alert</h3>
                        <div className="grid gap-4">
                            <Alert variant="default">
                                <AlertTitle>알림</AlertTitle>
                                <AlertDescription>기본 알림 메시지입니다.</AlertDescription>
                            </Alert>
                            <Alert variant="success">
                                <AlertTitle>성공</AlertTitle>
                                <AlertDescription>작업이 성공적으로 완료되었습니다.</AlertDescription>
                            </Alert>
                            <Alert variant="warning">
                                <AlertTitle>주의</AlertTitle>
                                <AlertDescription>이 작업은 되돌릴 수 없습니다.</AlertDescription>
                            </Alert>
                            <Alert variant="error">
                                <AlertTitle>오류</AlertTitle>
                                <AlertDescription>요청을 처리하는 중 오류가 발생했습니다.</AlertDescription>
                            </Alert>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="heading-4">Spinner</h3>
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="sm" />
                                <span className="caption">Small</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="default" />
                                <span className="caption">Default</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="lg" />
                                <span className="caption">Large</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="xl" />
                                <span className="caption">Extra Large</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 mt-4">
                            <Spinner variant="default" />
                            <Spinner variant="success" />
                            <Spinner variant="warning" />
                            <Spinner variant="error" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Data Display Components */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    데이터 표시 컴포넌트
                </h2>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="heading-4">Avatar</h3>
                        <div className="flex items-center gap-4">
                            <Avatar name="홍길동" size="sm" />
                            <Avatar name="김철수" size="default" variant="accent" />
                            <Avatar name="이영희" size="lg" variant="success" />
                            <Avatar name="박지성" size="xl" variant="warning" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="heading-4">Table</h3>
                        <div className="rounded-lg border border-[var(--color-border-default)] overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>이름</TableHead>
                                        <TableHead>파트</TableHead>
                                        <TableHead>상태</TableHead>
                                        <TableHead className="text-right">출석률</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">홍길동</TableCell>
                                        <TableCell>테너</TableCell>
                                        <TableCell><Badge variant="success">출석</Badge></TableCell>
                                        <TableCell className="text-right">100%</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">김철수</TableCell>
                                        <TableCell>베이스</TableCell>
                                        <TableCell><Badge variant="warning">지각</Badge></TableCell>
                                        <TableCell className="text-right">90%</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">이영희</TableCell>
                                        <TableCell>소프라노</TableCell>
                                        <TableCell><Badge variant="error">결석</Badge></TableCell>
                                        <TableCell className="text-right">80%</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Overlay Components */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    오버레이 컴포넌트
                </h2>
                <div className="flex gap-4">
                    <div className="space-y-2">
                        <h3 className="heading-4 mb-4">Dialog</h3>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">다이얼로그 열기</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>프로필 수정</DialogTitle>
                                    <DialogDescription>
                                        프로필 정보를 수정하고 저장 버튼을 누르세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            이름
                                        </Label>
                                        <Input id="name" value="홍길동" className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="username" className="text-right">
                                            아이디
                                        </Label>
                                        <Input id="username" value="@hong" className="col-span-3" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">저장</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="space-y-2">
                        <h3 className="heading-4 mb-4">Popover & Calendar</h3>
                        <div className="flex items-center gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">날짜 선택</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            if (date instanceof Date) {
                                                setSelectedDate(date);
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                            {selectedDate && (
                                <div className="flex items-center gap-2">
                                    <span className="body-small">선택된 날짜:</span>
                                    <span className="label">{selectedDate.toLocaleDateString('ko-KR')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Gradients */}
            <section className="space-y-6">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    그라데이션
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        className="h-32 rounded-lg flex items-center justify-center"
                        style={{
                            background: 'var(--gradient-blessed-sky)',
                            boxShadow: 'var(--shadow-base)',
                        }}
                    >
                        <span className="heading-3 text-white">Blessed Sky Gradient</span>
                    </div>
                    <div
                        className="h-32 rounded-lg flex items-center justify-center"
                        style={{
                            background: 'var(--gradient-primary-subtle)',
                            boxShadow: 'var(--shadow-base)',
                        }}
                    >
                        <span className="heading-3 text-[var(--color-primary-700)]">Primary Subtle</span>
                    </div>
                </div>
            </section>

            {/* Shadows */}
            <section className="space-y-6 pb-12">
                <h2 className="heading-2" style={{ borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--space-3)' }}>
                    그림자
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {['xs', 'sm', 'base', 'md', 'lg', 'xl'].map((size) => (
                        <div key={size} className="space-y-2">
                            <div
                                className="h-24 rounded-lg bg-white flex items-center justify-center"
                                style={{
                                    boxShadow: `var(--shadow-${size})`,
                                }}
                            >
                                <span className="label">shadow-{size}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
